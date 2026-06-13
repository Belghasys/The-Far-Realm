import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skull } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { LanguageSelector } from '../components/LanguageContext';
import { useGameStore } from '../store/gameStore';

export function LoginView() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const navigate = useNavigate();
    // Auth listener is handled globally in App.tsx now

    const currentAuthDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    const localhostUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//localhost:${window.location.port || '3000'}${window.location.pathname}${window.location.search}${window.location.hash}`
        : '';

    const formatAuthError = (e: any) => {
        if (e?.code === 'auth/unauthorized-domain') {
            return `Google login is blocked by Firebase because "${currentAuthDomain}" is not in Authentication > Settings > Authorized domains. Add "${currentAuthDomain}" there, or open the app from localhost instead: ${localhostUrl}`;
        }
        return e?.message || 'Authentication failed';
    };

    const handleLogin = async () => {
        try {
            setAuthError(null);
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/mode');
        } catch (e: any) {
            setAuthError("Login failed: " + formatAuthError(e));
        }
    };

    const handleSignup = async () => {
        try {
            setAuthError(null);
            await createUserWithEmailAndPassword(auth, email, password);
            navigate('/mode');
        } catch (e: any) {
            setAuthError("Signup failed: " + formatAuthError(e));
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setAuthError(null);
            await signInWithPopup(auth, googleProvider);
            navigate('/mode');
        } catch (e: any) {
            setAuthError("Google Login failed: " + formatAuthError(e));
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]">
            <div className="absolute top-4 right-4">
                <LanguageSelector />
            </div>

            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="bg-red-900/20 p-6 rounded-full border-4 border-red-900">
                        <Skull className="w-24 h-24 text-red-600 animate-pulse" />
                    </div>
                </div>
                <div>
                    <h1 className="text-6xl font-fantasy text-red-600 tracking-wider">DUNGEON AI</h1>
                    <p className="text-gray-400 mt-2 font-serif italic text-xl">The Realms Are Waiting...</p>
                </div>

                <div className="bg-gray-900/80 p-8 rounded-lg border border-gray-700 shadow-2xl backdrop-blur-sm space-y-4">
                    {authError && (
                        <div className="rounded-md border border-red-700/60 bg-red-950/50 p-3 text-left text-sm text-red-100">
                            {authError}
                        </div>
                    )}

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-black/50 border border-gray-600 p-4 rounded text-white focus:border-red-600 focus:outline-none transition-colors"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-gray-600 p-4 rounded text-white focus:border-red-600 focus:outline-none transition-colors"
                    />

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleLogin}
                            className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105"
                        >
                            Login
                        </button>
                        <button
                            onClick={handleSignup}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-lg transition-all"
                        >
                            Register
                        </button>
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-900 text-gray-400">Or continue with</span></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black font-bold py-3 rounded-lg transition-all hover:bg-gray-200 flex items-center justify-center gap-2"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        Sign in with Google
                    </button>

                </div>
            </div>
        </div>
    );
}
