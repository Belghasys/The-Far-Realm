import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseApp } from './services/persistence/firebase';
import { initAnalytics, setMonitoringUser, trackEvent } from './services/infra/monitoring';
import { memoryManager } from './services/persistence/memoryManager';
import { saveService } from './services/persistence/saveService';
import { useGameStore } from './store/gameStore';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

const LoginView = React.lazy(() => import('./views/LoginView').then(module => ({ default: module.LoginView })));
const ModeSelectionView = React.lazy(() => import('./views/ModeSelectionView').then(module => ({ default: module.ModeSelectionView })));
const LobbyView = React.lazy(() => import('./views/LobbyView').then(module => ({ default: module.LobbyView })));
const CharacterCreationView = React.lazy(() => import('./views/CharacterCreationView').then(module => ({ default: module.CharacterCreationView })));
const LegalView = React.lazy(() => import('./views/LegalView').then(module => ({ default: module.LegalView })));
const PricingView = React.lazy(() => import('./views/PricingView').then(module => ({ default: module.PricingView })));
const GameSessionView = React.lazy(() => import('./views/GameSessionView').then(module => ({ default: module.GameSessionView })));

function AuthGuard({ children }: { children: React.ReactNode }) {
   const user = useGameStore(state => state.user);
   const authReady = useGameStore(state => state.authReady);
   // Wait for Firebase to rehydrate the session before deciding — otherwise a page
   // refresh (user still null for a tick) would eject a logged-in player to login.
   if (!authReady) return <div className="min-h-screen bg-gray-950 text-white grid place-items-center">Chargement…</div>;
   if (!user) return <Navigate to="/" replace />;
   return <>{children}</>;
}

export default function App() {
   const setUser = useGameStore(state => state.setUser);

   useEffect(() => { void initAnalytics(firebaseApp); }, []);

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
         const previous = useGameStore.getState().user;
         setUser(u);
         memoryManager.setUserId(u?.uid || null);
         setMonitoringUser(u?.uid || null);
         if (u && !previous) trackEvent('login', { method: u.providerData[0]?.providerId || 'unknown' });
         if (u) {
            saveService.setUser(u.uid);
         } else {
            saveService.clearUser();
            useGameStore.getState().resetSessionState();
            // Le moteur (geminiRealtime → règles, prompt, panneaux de combat :
            // le tiers du bundle) ne se charge pas avec l'écran de connexion.
            // Il n'y a de session à couper que si quelqu'un ÉTAIT connecté :
            // ce rappel tire aussi au premier chargement, avec u = null, et
            // un import inconditionnel ici rechargerait tout ce qu'on vient
            // d'écarter. L'import dynamique renvoie la même instance de
            // module, donc le même singleton que celui de la partie.
            if (previous) {
               void import('./services/dm/geminiRealtime')
                  .then(m => m.LiveConnectionManager.getInstance().disconnect())
                  .catch(() => { /* hors ligne : rien à couper */ });
            }
         }
      });
      return unsubscribe;
   }, [setUser]);

   return (
      <ErrorBoundary>
         <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white grid place-items-center">Loading...</div>}>
               <Routes>
                  <Route path="/" element={<LoginView />} />
                  <Route path="/legal/:page" element={<LegalView />} />
                  <Route path="/pricing" element={<PricingView />} />

                  <Route path="/mode" element={
                     <AuthGuard><ModeSelectionView /></AuthGuard>
                  } />

                  <Route path="/lobby" element={
                     <AuthGuard><LobbyView /></AuthGuard>
                  } />

                  <Route path="/create" element={
                     <AuthGuard><CharacterCreationView /></AuthGuard>
                  } />

                  <Route path="/session" element={
                     <AuthGuard><GameSessionView /></AuthGuard>
                  } />

                  <Route path="*" element={<Navigate to="/" replace />} />
               </Routes>
            </Suspense>
         </BrowserRouter>
      </ErrorBoundary>
   );
}
