/** La session Live elle-meme : LiveDungeonMaster (connexion, micro, messages, outils, reconnexion) et LiveConnectionManager (l'instance unique). */
import { CharacterSheet } from "../../../types";
import { GoogleGenAI, Modality, Session, LiveServerMessage } from '@google/genai';
// @ts-ignore
import pcmProcessorUrl from '../pcm-processor.js?url';
import { memoryManager } from '../../persistence/memoryManager';
import { getCreature } from '../../../data/bestiary';
import { getCreatureAttacks } from '../../../engine/monsterAttacks';
import { preloadCodexBestiary } from '../../../engine/codexService';
import { getWeapon, weaponSummary } from '../../../data/weapons';
import { log } from '../../infra/logger';
import { buildSystemPrompt } from '../systemPrompt';
import { campaignEventLog } from '../../persistence/campaignEventLog';

import { auditBus } from '../../infra/auditBus';
import { getAppSettings } from '../../../store/settingsStore';
// IJ7 — lecture de l'activeSaveId pour lier le handle de reprise à la sauvegarde.
import { useGameStore } from '../../../store/gameStore';
import { sessionTrace } from '../../infra/sessionTrace';
import { arrayBufferToBase64, base64ToFloat32, floatTo16BitPCM } from './audio';
import { GAME_TOOL_DECLARATIONS } from './toolDeclarations';
import { appendTranscriptChunk } from './transcript';
import { AUDIO_MODEL, GEMINI_KEY, MAX_DEFERRED, QueuedTextMessage, REANCHOR_MIN_INTERVAL_MS, diagStamp, isWebSocketOpen } from './util';

// --- Live Client ---

let activeInstance: LiveDungeonMaster | null = null;
export class LiveDungeonMaster {
    private session: Session | null = null;
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private outputAnalyser: AnalyserNode | null = null;
    private animationFrameId: number | null = null;
    private inputWorklet: AudioWorkletNode | null = null;
    private _sendGate = false; // TRUE only when we are fully connected and ready to send
    private stream: MediaStream | null = null;
    private isConnected: boolean = false;
    private nextStartTime = 0;
    private onTranscriptUpdate: (speaker: 'user' | 'dm', text: string) => void;
    private onVolumeUpdate: (vol: number) => void;
    private onConnectionChange: (connected: boolean) => void;
    private onReconnecting?: (attempt: number, maxAttempts: number) => void;
    private onReconnectFailed?: () => void;
    private onReconnectSuccess?: () => void;
    private onQueueChange?: (queued: number) => void;
    private onToolCall?: (toolCall: any) => Promise<any>;
    private character: CharacterSheet;
    private adventure: string;
    private adventureManifest: string;
    private initialHistory: { speaker: 'user' | 'dm', text: string }[] = [];

    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 3;
    private isReconnecting: boolean = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private _lastConnectTime: number = 0; // Track when onopen fires to detect instant-close loops
    private isMuted: boolean = false;
    private playingNodes: AudioBufferSourceNode[] = [];
    private isDisconnected: boolean = false;
    private outboundTextQueue: QueuedTextMessage[] = [];
    private pendingToolResponses: any[] = [];
    private sessionResumptionHandle: string | null = null;
    private readonly sessionResumptionStorageKey: string;
    private directorContext: string = '';
    private lastDirectorContextSent: string = '';
    private lastDirectorContextSentAt: number = 0;
    /** File du GATE DE SILENCE : textes en attente de la fin de la tirade du MJ. */
    private deferredQueue: Array<{ text: string; at: number; onSent?: () => void }> = [];
    /** Mesure de fenêtre (usageMetadata) : plancher, dernier relevé, échantillon. */
    private firstPromptTokenCount = 0;
    private lastPromptTokenCount = 0;
    private lastTracedTokenCount = 0;

    // Buffer for accumulating DM transcript across multiple server messages
    private dmTranscriptBuffer: string = '';
    // IJ1 (audit trame) — la transcription JOUEUR arrive en fragments de 1-6
    // mots ; les committer un par un remplissait la fenêtre de restauration
    // (14 places) avec les miettes d'UNE seule phrase. Bufferisé comme le MJ.
    private userTranscriptBuffer: string = '';

    constructor(
        character: CharacterSheet,
        adventure: string,
        onTranscript: (s: 'user' | 'dm', t: string) => void,
        onVolume: (v: number) => void,
        onConnectionChange: (connected: boolean) => void,
        private language: string = 'French',
        initialHistory: { speaker: 'user' | 'dm', text: string }[] = [],
        adventureManifest: string = '',
        directorContext: string = '',
        onReconnecting?: (attempt: number, maxAttempts: number) => void,
        onReconnectFailed?: () => void,
        onReconnectSuccess?: () => void,
        onQueueChange?: (queued: number) => void,
        onToolCall?: (toolCall: any) => Promise<any>
    ) {
        this.onToolCall = onToolCall;
        this.character = character;
        this.adventure = adventure;
        this.adventureManifest = adventureManifest;
        this.directorContext = directorContext;
        this.initialHistory = initialHistory;
        this.onTranscriptUpdate = onTranscript;
        this.onVolumeUpdate = onVolume;
        this.onConnectionChange = onConnectionChange;
        this.onReconnecting = onReconnecting;
        this.onReconnectFailed = onReconnectFailed;
        this.onReconnectSuccess = onReconnectSuccess;
        this.onQueueChange = onQueueChange;
        this.sessionResumptionStorageKey = this.makeResumptionStorageKey(character.name, adventure);
        this.sessionResumptionHandle = this.loadResumptionHandle();

        if (activeInstance && activeInstance !== this) {
            activeInstance.disconnect();
        }
        activeInstance = this;
    }

    private makeResumptionStorageKey(characterName: string, adventure: string): string {
        const stable = `${characterName || 'hero'}_${adventure || 'adventure'}`
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .slice(0, 80);
        return `dungeonai_live_resumption_${stable}`;
    }

    // IJ7 (audit trame) — le handle de reprise est LIÉ à la sauvegarde et daté :
    // sans cela, charger un AUTRE slot du même héros reprenait la conversation
    // Live de la partie précédente (le MJ « se souvenait » d'événements que la
    // sauvegarde chargée n'a pas). Périmé après 30 min → session fraîche.
    private loadResumptionHandle(): string | null {
        try {
            const raw = localStorage.getItem(this.sessionResumptionStorageKey);
            if (!raw) return null;
            let parsed: { h?: string; s?: string | null; t?: number };
            try { parsed = JSON.parse(raw); } catch { return null; } // format hérité → fraîche
            const activeSaveId = useGameStore.getState().activeSaveId || null;
            const fresh = typeof parsed.t === 'number' && Date.now() - parsed.t < 30 * 60_000;
            const sameSave = (parsed.s || null) === activeSaveId;
            if (parsed.h && fresh && sameSave) return parsed.h;
            localStorage.removeItem(this.sessionResumptionStorageKey);
            return null;
        } catch {
            return null;
        }
    }

    private storeResumptionHandle(handle: string | null) {
        this.sessionResumptionHandle = handle;
        try {
            if (handle) {
                localStorage.setItem(this.sessionResumptionStorageKey, JSON.stringify({
                    h: handle,
                    s: useGameStore.getState().activeSaveId || null,
                    t: Date.now(),
                }));
            } else {
                localStorage.removeItem(this.sessionResumptionStorageKey);
            }
        } catch {
            // Resumption is an optimization. The app can still reconnect with restored history.
        }
    }

    async connect(): Promise<void> {
        log.info('🔌 Connecting to Gemini Live API...');

        if (!GEMINI_KEY) {
            throw new Error('Missing VITE_GEMINI_API_KEY. Add it to .env.local and rebuild before deploying.');
        }

        // Close gate BEFORE connecting so stale worklets from previous connections can't send
        this._sendGate = false;
        // IJ5 — jamais de résidu de transcription d'une session précédente qui
        // fuirait dans le premier turnComplete de la nouvelle.
        this.dmTranscriptBuffer = '';
        this.userTranscriptBuffer = '';

        // A FRESH session (no resumption handle) has no memory of the previous
        // connection's tool-call ids — replaying queued tool responses into it
        // errors the brand-new connection and could loop the reconnect. Only a
        // RESUMED session may flush held responses.
        if (!this.sessionResumptionHandle) this.pendingToolResponses = [];

        const systemPrompt = buildSystemPrompt({
            character: this.character,
            adventure: this.adventure,
            adventureManifest: this.adventureManifest,
            historyToRestore: this.initialHistory,
            language: this.language,
            characterName: this.character.name,
            directorContext: this.directorContext,
        });
        // Le contexte directeur vient d'être EMBARQUÉ dans le prompt : le marquer
        // « déjà envoyé » pour que le flush post-(re)connexion ne renvoie pas le
        // même bloc en double 4 s plus tard (dédup naturelle, sauf s'il change).
        if (this.directorContext.trim()) {
            this.lastDirectorContextSent = this.directorContext.trim();
            this.lastDirectorContextSentAt = Date.now();
        }

        auditBus.publish('gemini-system', `Live system prompt (${systemPrompt.length} chars, model ${AUDIO_MODEL})`, systemPrompt);
        auditBus.publish('engine', `Live connect — ${this.sessionResumptionHandle ? 'reprise par handle' : 'session FRAÎCHE'}, prompt ${systemPrompt.length} chars, ${this.initialHistory.length} répliques en mémoire`);

        const ai = new GoogleGenAI({
            apiKey: GEMINI_KEY,
            httpOptions: { apiVersion: 'v1beta' }
        });
        const resumingFromHandle = Boolean(this.sessionResumptionHandle);

        try {
            const currentSession = await ai.live.connect({
                model: AUDIO_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                // Voix choisie dans les Réglages (défaut Charon) —
                                // appliquée à chaque (re)connexion.
                                voiceName: getAppSettings().dmVoice || 'Charon'
                            }
                        }
                    },
                    tools: [{ functionDeclarations: GAME_TOOL_DECLARATIONS as any }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    sessionResumption: {
                        handle: this.sessionResumptionHandle || undefined,
                    },
                    // COMPRESSION (revu le 2026-08-22). L'ancien réglage
                    // 60K→30K amputait la MOITIÉ du contexte à chaque passage,
                    // et 30K est de l'ordre du plancher fixe de la session
                    // (déclarations d'outils ~15K tokens + prompt système ~13K) :
                    // il ne restait presque rien de la conversation. La fenêtre
                    // du modèle est de 128K — on déclenche donc plus tard et on
                    // garde beaucoup plus. Coût : plus de tokens d'entrée par
                    // tour. usageMetadata (ci-dessous) mesure désormais l'effet
                    // réel dans le journal de session : à ajuster sur données,
                    // plus sur hypothèse.
                    contextWindowCompression: {
                        triggerTokens: '100000',
                        slidingWindow: { targetTokens: '70000' }
                    },
                },
                callbacks: {
                    onopen: () => {
                        if (this.isDisconnected) return;
                        log.info('✅ Gemini Live Session Connected');
                        this.isConnected = true;
                        this._sendGate = true; // Open gate ONLY when connection is confirmed open
                        this._lastConnectTime = Date.now();
                        // Do NOT reset reconnectAttempts here. It's done intelligently in attemptReconnect.
                        this.onConnectionChange(true);
                        if (!resumingFromHandle) this.restoreHistory();
                        this.flushOutboundTextQueue();
                        this.flushToolResponseQueue();
                    },
                    onmessage: (msg: LiveServerMessage) => {
                        if (this.isDisconnected) return;
                        this.handleGeminiMessage(msg);
                    },
                    onerror: (e: ErrorEvent) => {
                        log.error('Gemini Live Error:', e);
                        this._sendGate = false; // CLOSE gate immediately on error
                    },
                    onclose: (e: CloseEvent) => {
                        log.error('❌ Gemini Live Connection closed', e.code, e.reason);
                        auditBus.publish('engine', `Live close — code=${e.code}${e.reason ? ` raison="${String(e.reason).slice(0, 120)}"` : ''}`);
                        // IJ5 — la dernière tirade avant une coupure ne doit pas
                        // disparaître de la trame : flush des buffers d'abord.
                        this.commitUserBuffer();
                        this.commitDmBuffer(true);
                        // 1. CLOSE THE GATE FIRST — this is the fastest possible signal
                        this._sendGate = false;
                        // 2. Kill everything SYNCHRONOUSLY
                        this.killAudioPipeline();
                        this.isConnected = false;
                        const s = this.session;
                        this.session = null; // Null so no handler can use it
                        if (s) { try { s.close(); } catch(_) {} }
                        this.onConnectionChange(false);
                        if (!this.isReconnecting) this.attemptReconnect();
                    }
                }
            });

            if (this.isDisconnected) {
                log.info('🔌 Component got disconnected while connecting. Destroying rogue session.');
                try { currentSession.close(); } catch(_) {}
                return;
            }
            this.session = currentSession;
            if (this.isConnected) {
                if (!resumingFromHandle) this.restoreHistory();
                this.flushOutboundTextQueue();
                // LM2 (contre-audit) — les flushes appelés dans onopen sont des
                // no-ops garantis (le SDK invoque onopen AVANT de résoudre
                // connect(), donc this.session est encore null). Après une
                // reconnexion avec handle de reprise, les réponses d'outils en
                // attente n'étaient JAMAIS renvoyées : le modèle restait
                // suspendu sur son function call et le MJ se taisait.
                this.flushToolResponseQueue();
            }

            try {
                await this.setupAudio();
            } catch (audioError) {
                log.error("Audio pipeline setup failed (falling back to text-only):", audioError);
            }
        } catch (e) {
            this._sendGate = false;
            log.error("Failed to connect to Gemini Live:", e);
            if (resumingFromHandle && !this.isDisconnected) {
                log.warn('Session resumption failed. Clearing handle and opening a fresh Live session.');
                this.storeResumptionHandle(null);
                return this.connect();
            }
            throw e;
        }
    }

    private restoreHistory() {
        log.info(`📜 History is restored via system prompt instructions (${this.initialHistory.length} messages).`);
    }

    // Keep the in-memory history current as the session unfolds. A reconnect WITHOUT a
    // resumption handle rebuilds the system prompt from this.initialHistory; if we never
    // append, the DM forgets every beat since it was constructed. Capped well above the
    // prompt's RESTORE_LIMIT so the restore window keeps the most recent beats.
    private recordHistory(speaker: 'user' | 'dm', text: string) {
        if (!text || !text.trim()) return;
        this.initialHistory.push({ speaker, text });
        const MAX_HISTORY = 200;
        if (this.initialHistory.length > MAX_HISTORY) {
            this.initialHistory = this.initialHistory.slice(-MAX_HISTORY);
        }
    }

    private async setupAudio() {
        if (this.inputContext && this.inputContext.state === 'closed') this.inputContext = null;
        if (this.outputContext && this.outputContext.state === 'closed') this.outputContext = null;

        if (!this.inputContext) this.inputContext = new AudioContext({ sampleRate: 16000 });
        if (!this.outputContext) {
            this.outputContext = new AudioContext({ sampleRate: 24000 });
            this.outputAnalyser = this.outputContext.createAnalyser();
            this.outputAnalyser.fftSize = 256;
            this.outputAnalyser.connect(this.outputContext.destination);
        }

        await this.resumeAudioContext();
        this.nextStartTime = 0;

        await this.startMicrophone();
        this.startVolumePolling();
    }

    private startVolumePolling() {
        if (this.animationFrameId) return;

        const bufferLength = this.outputAnalyser ? this.outputAnalyser.frequencyBinCount : 0;
        const dataArray = new Uint8Array(bufferLength);

        const poll = () => {
            if (this.isDisconnected || !this.isConnected || !this.outputAnalyser) {
                this.animationFrameId = null;
                return;
            }

            if (this.playingNodes.length > 0) {
                this.outputAnalyser.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const v = (dataArray[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / bufferLength);
                this.onVolumeUpdate(rms * 50);
            } else {
                this.onVolumeUpdate(0);
            }

            this.animationFrameId = requestAnimationFrame(poll);
        };

        this.animationFrameId = requestAnimationFrame(poll);
    }

    private async resumeAudioContext() {
        if (this.inputContext && this.inputContext.state === 'suspended') await this.inputContext.resume();
        if (this.outputContext && this.outputContext.state === 'suspended') await this.outputContext.resume();
        log.info("🔊 Audio Context state:", this.outputContext?.state);
    }

    private async startMicrophone() {
        if (!this.inputContext || this.inputContext.state === 'closed') {
            log.error("Cannot start microphone: inputContext is null or closed");
            return;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // RE-CHECK after async getUserMedia — killAudioPipeline may have nulled inputContext
            if (!this.inputContext || (this.inputContext.state as string) === 'closed') {
                log.error("inputContext destroyed during getUserMedia, aborting mic setup");
                if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
                return;
            }

            const source = this.inputContext.createMediaStreamSource(this.stream);

            await this.inputContext.audioWorklet.addModule(pcmProcessorUrl);

            // RE-CHECK again after addModule
            if (!this.inputContext || (this.inputContext.state as string) === 'closed') {
                log.error("inputContext destroyed during addModule, aborting mic setup");
                if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
                return;
            }

            this.inputWorklet = new AudioWorkletNode(this.inputContext, 'pcm-processor');
            this.inputWorklet.port.onmessage = (e) => {
                // TRIPLE GUARD:
                // 1. Send gate (fastest — set synchronously in onclose/onerror)
                if (!this._sendGate) return;
                // 2. Basic flags
                if (!this.isConnected || this.isMuted || !this.session) return;
                // 3. REAL WebSocket readyState check — the SDK's internal WS object
                if (!isWebSocketOpen(this.session)) {
                    // WS is CLOSING or CLOSED but onclose hasn't fired yet
                    this._sendGate = false; // Slam the gate shut for ALL subsequent messages
                    return;
                }

                const float32Data = e.data;
                const pcm16 = floatTo16BitPCM(float32Data);
                const base64Audio = arrayBufferToBase64(pcm16);

                try {
                    this.session.sendRealtimeInput({
                        audio: {
                            data: base64Audio,
                            mimeType: 'audio/pcm;rate=16000'
                        }
                    });
                } catch {
                    // If send fails, close the gate permanently for this connection
                    this._sendGate = false;
                    return;
                }
            };

            source.connect(this.inputWorklet);
        } catch (e) {
            log.error("Microphone setup failed:", e);
        }
    }

    public isConnectedState() {
        return this.isConnected;
    }

    public isDisconnectedState() {
        return this.isDisconnected;
    }

    public isMutedState() {
        return this.isMuted;
    }

    public getLanguage(): string {
        return this.language;
    }

    public updateCharacter(newCharacter: CharacterSheet) {
        this.character = newCharacter;
        log.info('🔄 Live DM character reference updated');
    }

    public updateDirectorContext(context: string) {
        const next = String(context || '').trim();
        if (!next || next === this.directorContext) return;
        this.directorContext = next;
    }

    /**
     * Push the pending director context to the DM as a private system note.
     * In pure-voice play the player never types, so consumePrivateContext (which
     * only piggybacks on TEXT messages) never fires and the DM's view of HP,
     * clocks, and canon facts silently drifts. GameSession calls this on
     * significant state changes; a min-interval guard keeps the cost bounded.
     */
    /**
     * DC2/DC3 — `force` bypasse le DÉDUP : renvoyer un contexte identique est
     * un RAPPEL (battement périodique, reprise après reconnexion), pas une
     * mise à jour.
     *
     * TR10 — il ne bypasse PLUS le throttle. Les appelants qui veulent un envoi
     * immédiat passent déjà `minIntervalMs = 0` (battement, post-reconnexion) ;
     * le ré-ancrage post-compression, lui, se donne un plancher, parce qu'il
     * partait jusqu'à quatre fois par minute et nourrissait la compression
     * qu'il était censé réparer.
     */
    public flushDirectorContext(minIntervalMs: number = 30000, force = false): boolean {
        const context = this.directorContext.trim();
        if (!context || !this.canSendRealtime()) return false;
        const now = Date.now();
        if (!force && context === this.lastDirectorContextSent) return false;
        if (now - this.lastDirectorContextSentAt < minIntervalMs) return false;

        // GATE DE SILENCE : jamais pendant une tirade. Le bloc part au silence.
        // Le marquage « envoyé » se fait à l'envoi RÉEL (callback), sinon un
        // contexte différé puis jeté serait compté comme délivré.
        const sent = this.sendOrDefer([
            '[PRIVATE_DM_CONTEXT - do not narrate, do not answer this block, do not roll from this block alone]',
            context,
            '[/PRIVATE_DM_CONTEXT]',
        ].join('\n'), () => {
            this.lastDirectorContextSent = context;
            this.lastDirectorContextSentAt = Date.now();
            // Journal de session : chaque envoi du bloc directeur est un
            // événement de pression sur la fenêtre — taille + mode consignés,
            // bloc COMPLET dans la trace disque (pas dans l'auditBus mémoire).
            auditBus.publish('engine', `Director context envoyé (${context.length} chars${force ? ', FORCÉ' : ''})`);
            sessionTrace.trace('director', `flush ${context.length} chars${force ? ' (forcé)' : ''}`, context);
        });
        return sent;
    }

    private consumePrivateContext(userText: string): string {
        const context = this.directorContext.trim();
        if (!context) return userText;
        const now = Date.now();
        const shouldAttach = context !== this.lastDirectorContextSent || now - this.lastDirectorContextSentAt > 30000;
        if (!shouldAttach) return userText;

        this.lastDirectorContextSent = context;
        this.lastDirectorContextSentAt = now;
        return [
            '[PRIVATE_DM_CONTEXT - do not narrate, do not answer this block, do not roll from this block alone]',
            context,
            '[/PRIVATE_DM_CONTEXT]',
            '',
            userText,
        ].join('\n');
    }

    private sendPrivateSystemNote(text: string): boolean {
        const note = String(text || '').trim();
        if (!note) return true;
        if (!this.canSendRealtime()) {
            this.queueTextMessage(`[SYSTEM]: ${note}`);
            return false;
        }
        // GATE DE SILENCE : les notes système (auditeur de cohérence, rappels
        // PNJ, rapports moteur) attendent la fin de la tirade du MJ.
        return this.sendOrDefer(`[SYSTEM]: ${note}`);
    }

    private handleGeminiMessage(msg: LiveServerMessage) {
        this.handleSessionManagementMessage(msg);

        const content = msg.serverContent;

        if (content) {
            // --- Audio output ---
            if (content.modelTurn?.parts) {
                for (const part of content.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        this.playAudio(part.inlineData.data);
                    }
                }
            }

            // --- Input transcription (user speech) ---
            // IJ1 — l'UI est rafraîchie par fragment (temps réel), mais la
            // MÉMOIRE ne reçoit que la phrase complète, au flush du tour.
            if (content.inputTranscription?.text) {
                // [DIAG-COUPURE] Le serveur « entend » le joueur PENDANT que le MJ
                // parle : soit vraie interruption voulue, soit écho/bruit — le
                // texte transcrit ci-dessous tranche (mots du MJ = écho).
                if (this.playingNodes.length > 0) {
                    const diag = `[DIAG-COUPURE] ${diagStamp()} MICRO entendu pendant que le MJ parle (écho ?) : « ${content.inputTranscription.text.slice(0, 50)} »`;
                    log.info(diag);
                    auditBus.publish('gemini-in', diag);
                }
                this.onTranscriptUpdate('user', content.inputTranscription.text);
                this.userTranscriptBuffer = appendTranscriptChunk(this.userTranscriptBuffer, content.inputTranscription.text);
            }

            // --- Output transcription (DM speech) ---
            if (content.outputTranscription?.text) {
                this.dmTranscriptBuffer = appendTranscriptChunk(this.dmTranscriptBuffer, content.outputTranscription.text);
            }

            // --- Interruption handling ---
            if (content.interrupted) {
                const diag = `[DIAG-COUPURE] ${diagStamp()} INTERRUPTION serveur — ${this.playingNodes.length} segment(s) audio stoppé(s) — narration coupée : « …${this.dmTranscriptBuffer.slice(-60)} »`;
                log.info(diag);
                auditBus.publish('gemini-in', diag);
                this.handleInterruption();
            }

            // --- Turn complete: flush user THEN DM buffers (ordre chronologique) ---
            if (content.turnComplete) {
                log.info(`[DIAG-COUPURE] ${diagStamp()} fin de tour NORMALE (turnComplete)`);
                this.commitUserBuffer();
                this.commitDmBuffer();
            }
        }

        // --- Tool calls ---
        if (msg.toolCall?.functionCalls) {
            this.handleToolCalls(msg.toolCall.functionCalls);
        }

        // --- Tool call cancellation ---
        if (msg.toolCallCancellation) {
            log.info("🛠️ Tool call cancelled by server");
        }
    }

    private handleSessionManagementMessage(msg: LiveServerMessage) {
        const update = msg.sessionResumptionUpdate;
        if (update?.resumable && update.newHandle) {
            this.storeResumptionHandle(update.newHandle);
        }

        // ── MESURE DE LA FENÊTRE (2026-08-22) ────────────────────────────────
        // usageMetadata est fourni par le SDK à chaque réponse et n'était JAMAIS
        // lu. Il donne : le plancher réel de la session (outils + prompt système,
        // ~15K + ~13K tokens estimés mais jamais vérifiés), le vrai débit audio,
        // et surtout la DÉTECTION DE COMPRESSION — une chute franche du
        // promptTokenCount signifie que le serveur vient d'élaguer l'historique.
        // Sans ça, le client narre à l'aveugle sur une mémoire qu'il croit
        // intacte. Tout part au journal de session pour analyse après-coup.
        const usage: any = (msg as any).usageMetadata;
        if (usage && typeof usage.promptTokenCount === 'number') {
            const prompt = usage.promptTokenCount;
            const prev = this.lastPromptTokenCount;
            this.lastPromptTokenCount = prompt;
            if (this.firstPromptTokenCount === 0) {
                this.firstPromptTokenCount = prompt;
                sessionTrace.trace('tokens', `Plancher de session : ${prompt} tokens au 1er tour`, usage);
            }
            // ⚠️ GRANDEUR NON QUALIFIÉE (audit 2026-08-24, lot 5 — « mesurer,
            // pas régler »). Ce seuil s'appuyait sur l'idée que promptTokenCount
            // reflète l'occupation de la fenêtre. Les traces du 23/08 l'excluent :
            //
            //  · valeurs jusqu'à 512 465 sur une fenêtre annoncée de 128 000 —
            //    soit 4× ; ce ne peut pas être l'occupation courante ;
            //  · série non monotone dans les DEUX sens, avec un bond de +414 000
            //    en une minute, alors que l'audio ne produit que ~1 500 tok/min ;
            //  · l'hypothèse « accumulation sur les allers-retours d'outils » a
            //    été TESTÉE et réfutée : les deux plus gros pics surviennent sans
            //    aucun appel d'outil dans les 25 s précédentes ;
            //  · la somme des modalités vaut ~90-93 % du total, donc le détail
            //    lui-même est incomplet.
            //
            // Conséquence : cette chute de 25 % n'est PAS une compression prouvée,
            // et le réglage 100K/70K plus haut a été choisi sur cette lecture. On
            // ne touche à rien tant que la grandeur n'est pas établie — ce qui
            // demande la documentation du SDK ou une séance contrôlée d'un puis
            // deux tours. Le ré-ancrage déclenché ici reste inoffensif (même bloc
            // que le battement, plancher de 90 s), d'où le choix de le laisser.
            if (prev > 0 && prompt < prev * 0.75) {
                const line = `Chute du promptTokenCount : ${prev} → ${prompt} (−${prev - prompt}) — grandeur non qualifiée, voir lot 5`;
                log.warn(`📉 ${line}`);
                auditBus.publish('engine', line, usage);
                sessionTrace.trace('tokens', line, usage);
                campaignEventLog.append('CONNECTION_EVENT', line, { before: prev, after: prompt });
                // La mémoire vivante vient d'être amputée : re-poser l'état
                // complet dès que le MJ se taira (le gate s'en charge).
                //
                // TR10 (audit de séance du 2026-08-23) — mais PAS à chaque fois.
                // Séance mesurée : 78 compressions en 34 min (une toutes les
                // 26 s) et 29 ré-ancrages forcés, soit 349 Ko réinjectés — dont
                // 91 % identiques au bloc précédent. C'était une boucle : la
                // compression déclenchait un renvoi de 12 Ko, qui regonflait la
                // fenêtre, qui déclenchait la compression suivante. Le plancher
                // ci-dessous casse la boucle sans rien retirer au contenu :
                // l'état complet est toujours re-posé, simplement pas quatre
                // fois par minute.
                this.flushDirectorContext(REANCHOR_MIN_INTERVAL_MS, true);
            } else if (prompt - this.lastTracedTokenCount >= 5000) {
                // Échantillonnage : une ligne tous les +5K tokens, pas par tour.
                this.lastTracedTokenCount = prompt;
                sessionTrace.trace('tokens', `Contexte : ${prompt} tokens`, usage);
            }
        }

        if (msg.goAway) {
            const delay = this.delayBeforeGoAwayReconnect(msg.goAway.timeLeft);
            campaignEventLog.append('CONNECTION_EVENT', 'Gemini Live sent goAway; scheduling reconnect', {
                timeLeft: msg.goAway.timeLeft,
                delay,
            });
            log.warn(`Gemini Live goAway received. Reconnecting in ${delay}ms.`);
            sessionTrace.trace('connexion', `goAway reçu — reconnexion planifiée dans ${delay}ms`, { timeLeft: msg.goAway.timeLeft });
            this.scheduleForcedReconnect(delay);
        }
    }

    private delayBeforeGoAwayReconnect(timeLeft?: string): number {
        const match = String(timeLeft || '').match(/([\d.]+)/);
        const millis = match ? Number(match[1]) * 1000 : 2500;
        return Math.max(250, Math.min(millis - 1000, 5000));
    }

    private scheduleForcedReconnect(delay: number) {
        if (this.reconnectTimer || this.isDisconnected) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.forceReconnect();
        }, delay);
    }

    private forceReconnect() {
        if (this.isReconnecting || this.isDisconnected) return;
        this._sendGate = false;
        this.killAudioPipeline();
        this.isConnected = false;
        const s = this.session;
        this.session = null;
        if (s) { try { s.close(); } catch(_) {} }
        // Un goAway est une passation PLANIFIÉE par Google, pas une panne : les
        // compteurs de fenêtre repartent de zéro sur la nouvelle session, sinon
        // la première mesure serait lue comme une compression géante.
        this.firstPromptTokenCount = 0;
        this.lastPromptTokenCount = 0;
        this.lastTracedTokenCount = 0;
        this.onConnectionChange(false);
        this.attemptReconnect();
    }

    /** Committe la phrase du joueur bufferisée (IJ1) — une seule entrée propre. */
    private commitUserBuffer() {
        const spoken = this.userTranscriptBuffer.trim();
        this.userTranscriptBuffer = '';
        if (!spoken) return;
        // Journal de session : les répliques VOCALES du joueur n'apparaissaient
        // nulle part dans l'audit (seules les tirades MJ y passaient).
        auditBus.publish('gemini-out', `PLAYER (voix) : ${spoken.slice(0, 90)}`, spoken);
        memoryManager.addMessage({ speaker: 'user', text: spoken });
        this.recordHistory('user', spoken);
    }

    /** Committe la narration MJ bufferisée. `interrupted` = coupée par le
     *  joueur : on l'enregistre QUAND MÊME (IJ5/MM2 — elle a été entendue ;
     *  la jeter créait des trous dans le transcript, la mémoire ET la
     *  sauvegarde), suffixée pour que le MJ sache qu'il a été coupé. */
    private commitDmBuffer(interrupted = false) {
        const spokenDm = this.dmTranscriptBuffer.trim();
        this.dmTranscriptBuffer = '';
        if (!spokenDm) return;
        const text = interrupted ? `${spokenDm} …` : spokenDm;
        auditBus.publish('gemini-in', `DM${interrupted ? ' (interrompu)' : ''}: ${text.slice(0, 90)}`, text);
        this.onTranscriptUpdate('dm', text);
        memoryManager.addMessage({ speaker: 'dm', text });
        this.recordHistory('dm', text);
    }

    private handleInterruption() {
        // Stop all currently playing audio nodes
        this.playingNodes.forEach(node => {
            try { node.stop(); } catch (e) { /* ignore */ }
        });
        this.playingNodes = [];
        this.nextStartTime = 0;
        // IJ5/MM2 — enregistrer la narration partielle AVANT de vider : le
        // joueur l'a entendue, elle fait partie de la trame.
        this.commitUserBuffer();
        this.commitDmBuffer(true);
        // Le MJ s'est tu (coupé par le joueur) : la file différée peut partir.
        this.flushDeferred();
    }

    private playAudio(base64Audio: string) {
        if (!this.outputContext || this.outputContext.state === 'closed') return;

        try {
            const float32 = base64ToFloat32(base64Audio);

            const buffer = this.outputContext.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);

            const source = this.outputContext.createBufferSource();
            source.buffer = buffer;
            if (this.outputAnalyser) {
                source.connect(this.outputAnalyser);
            } else {
                source.connect(this.outputContext.destination);
            }

            const currentTime = this.outputContext.currentTime;
            if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;

            source.start(this.nextStartTime);
            this.nextStartTime += buffer.duration;

            // Track for interruption
            this.playingNodes.push(source);
            source.onended = () => {
                this.playingNodes = this.playingNodes.filter(n => n !== source);
                // Gate de silence : le dernier segment vient de finir → on peut
                // enfin livrer ce qui attendait sans risquer de couper le MJ.
                if (this.playingNodes.length === 0) this.flushDeferred();
            };
        } catch (e) {
            log.error("Failed to play audio delta:", e);
        }
    }

    private async handleToolCalls(calls: any[]) {
        // request_roll (and cast_spell with a roll) BLOCKS until the player
        // actually rolls — its tool response carries the real outcome, which is
        // what mechanically stops the Live model from narrating a result it
        // does not have. Process roll calls LAST and send every response as
        // soon as it is ready, so music/image/journal responses are never held
        // hostage by the dice.
        const ordered = [...calls].sort((a, b) =>
            Number(a?.name === 'request_roll' || a?.name === 'cast_spell')
            - Number(b?.name === 'request_roll' || b?.name === 'cast_spell'));

        for (const call of ordered) {
            const { name, args, id } = call;
            log.info(`🛠️ Tool Call: ${name}`, JSON.stringify(args));

            let result: any = { error: "Unknown function" };

            if (name === "lookup_creature") {
                await preloadCodexBestiary();
                const creature = getCreature(args?.name);
                if (creature) {
                    const attacks = getCreatureAttacks(creature);
                    result = {
                        found: true,
                        id: creature.id,
                        name: creature.name,
                        cr: creature.cr,
                        xp: creature.xp,
                        hp: creature.hp.base,
                        hpDice: creature.hp.dice,
                        ac: creature.ac,
                        speed: creature.speed,
                        stats: creature.stats,
                        attacks: attacks.map(a => ({
                            name: a.name,
                            attackBonus: a.attackBonus,
                            damage: a.damage,
                            damageType: a.damageType,
                            reach: a.reach,
                            range: a.ranged ? `${a.ranged.short}/${a.ranged.long}` : undefined,
                            damageParts: a.damageParts,
                        })),
                        type: creature.type,
                        size: creature.size,
                        action: creature.action,
                        speedStr: creature.speedStr
                    };
                } else {
                    result = { found: false, error: "Creature not found" };
                }
            } else if (name === "lookup_weapon") {
                const weapon = getWeapon(args?.name);
                result = weapon ? {
                    found: true,
                    summary: weaponSummary(weapon),
                    name: weapon.name,
                    damage: weapon.damage,
                    damageType: weapon.damageType,
                    properties: weapon.properties
                } : { found: false, error: "Weapon not found" };
            } else if (this.onToolCall) {
                try {
                    result = await this.onToolCall(call);
                } catch (e: any) {
                    log.error(`Error executing tool call ${name}:`, e);
                    result = { error: e.message || "Execution failed" };
                }
            }

            auditBus.publish('gemini-tool', name, { args, result });

            // Send each response the moment it is ready (a held roll response
            // must not delay the other tools' responses in the same batch).
            this.queueToolResponses([{ id, name, response: result }]);
        }
    }

    private queueToolResponses(responses: any[]) {
        if (!responses.length) return;
        this.pendingToolResponses = [...this.pendingToolResponses, ...responses].slice(-50);
        this.flushToolResponseQueue();
    }

    private flushToolResponseQueue() {
        if (!this.canSendRealtime() || this.pendingToolResponses.length === 0) return;
        const functionResponses = [...this.pendingToolResponses];
        try {
            this.session!.sendToolResponse({ functionResponses });
            this.pendingToolResponses = [];
        } catch (e) {
            log.error('Failed to send tool response (session closed); keeping it queued:', e);
            this._sendGate = false;
        }
    }

    private canSendRealtime(): boolean {
        return Boolean(this.session && this.isConnected && isWebSocketOpen(this.session));
    }

    private queueTextMessage(text: string) {
        this.outboundTextQueue = [...this.outboundTextQueue, { text, createdAt: Date.now() }].slice(-50);
        this.onQueueChange?.(this.outboundTextQueue.length);
        campaignEventLog.append('CONNECTION_EVENT', 'Queued text for Gemini Live reconnect', {
            queued: this.outboundTextQueue.length,
        });
    }

    /** Le MJ a-t-il de l'audio EN COURS DE LECTURE ?
     *  ⚠️ `turnComplete` ne veut PAS dire silence : playAudio programme les
     *  segments dans le futur via nextStartTime, donc la génération est finie
     *  bien avant que le joueur ait fini d'entendre. Seul playingNodes fait foi. */
    private isSpeaking(): boolean {
        return this.playingNodes.length > 0;
    }

    /**
     * GATE DE SILENCE (2026-08-22) — envoie le texte MAINTENANT si le MJ se
     * tait, sinon le DIFFÈRE jusqu'à la fin de sa tirade.
     *
     * Pourquoi : toute injection de texte pendant que le MJ parle peut être
     * interprétée par Gemini Live comme une prise de parole du joueur → barge-in
     * → narration coupée net. Le battement de contexte (toutes les 4 min), la
     * note de l'auditeur de cohérence et les rappels PNJ tiraient à l'aveugle.
     * C'est la cause n°1 suspectée des coupures signalées par le joueur.
     *
     * File DÉDIÉE : outboundTextQueue ne convient pas (elle périme à 60 s et
     * jette tout bloc [PRIVATE_DM_CONTEXT — IJ4), elle sert aux reconnexions.
     */
    private sendOrDefer(text: string, onSent?: () => void): boolean {
        if (!this.canSendRealtime()) return false;
        if (!this.isSpeaking()) {
            const ok = this.sendRealtimeTextNow(text);
            if (ok) onSent?.();
            return ok;
        }
        this.deferredQueue.push({ text, at: Date.now(), onSent });
        // Borne dure : en cas de tirade interminable, on garde les plus RÉCENTS
        // (un contexte périmé n'a aucune valeur).
        if (this.deferredQueue.length > MAX_DEFERRED) this.deferredQueue.shift();
        auditBus.publish('engine', `Envoi différé (MJ parle) : ${text.slice(0, 60)}`);
        return true; // accepté — partira au silence
    }

    /** Vide la file différée dès que le MJ se tait. */
    private flushDeferred(): void {
        if (!this.deferredQueue.length || this.isSpeaking() || !this.canSendRealtime()) return;
        const pending = this.deferredQueue.splice(0, this.deferredQueue.length);
        for (const item of pending) {
            if (this.sendRealtimeTextNow(item.text)) item.onSent?.();
        }
    }

    private sendRealtimeTextNow(text: string): boolean {
        if (!this.session || !this.canSendRealtime()) return false;
        // [DIAG-COUPURE] Toute injection de texte passe ici — noter si elle part
        // pendant que le MJ a de l'audio en cours (candidate à le couper).
        const diagSpeaking = this.playingNodes.length > 0;
        const diag = `[DIAG-COUPURE] ${diagStamp()} ENVOI texte — MJ ${diagSpeaking ? `PARLE (${this.playingNodes.length} segment(s)) ⚠️` : 'silencieux'} — ${text.slice(0, 70)}`;
        log.info(diag);
        auditBus.publish('gemini-out', diag, text);
        try {
            this.session.sendRealtimeInput({ text });
            return true;
        } catch (e) {
            log.error('Failed to send realtime text:', e);
            this._sendGate = false;
            return false;
        }
    }

    private sendOrQueueText(text: string): boolean {
        if (this.sendRealtimeTextNow(text)) return true;
        this.queueTextMessage(text);
        if (!this.isReconnecting && !this.isDisconnected) this.attemptReconnect();
        return false;
    }

    private flushOutboundTextQueue() {
        if (!this.canSendRealtime() || this.outboundTextQueue.length === 0) return;

        // IJ4/LM17 — péremption : après une longue coupure, rejouer de vieux
        // [SYSTEM]/contextes faisait « reculer » le MJ (le prompt reconstruit
        // décrit déjà l'état À JOUR). On jette ce qui a plus de 60 s et tout
        // bloc [PRIVATE_DM_CONTEXT (le contexte frais repart par son canal).
        const now = Date.now();
        const queued = [...this.outboundTextQueue].filter(item =>
            now - (item.createdAt || 0) <= 60_000
            && !item.text.startsWith('[PRIVATE_DM_CONTEXT'));
        this.outboundTextQueue = [];
        this.onQueueChange?.(0);

        for (const item of queued) {
            if (!this.sendRealtimeTextNow(item.text)) {
                this.outboundTextQueue.unshift(item);
                this.onQueueChange?.(this.outboundTextQueue.length);
                break;
            }
        }
    }

    async sendUserMessage(text: string) {
        auditBus.publish('gemini-out', `User → DM: ${text.slice(0, 90)}`, text);
        // TYPED player messages must reach long-term memory too. Voice input is
        // recorded via inputTranscription, but typed text never came back
        // through that channel — so the 60K summaries and the reconnect history
        // were DM-narration-only for keyboard players (their promises and
        // decisions vanished from "the story so far"). Engine/control payloads
        // (lines starting with '[' — [SYSTEM], [ROLL_RESULT:, [PRIVATE_DM_CONTEXT)
        // stay out of memory: they are mechanics, not story.
        const spoken = String(text || '').trim();
        if (spoken && !spoken.startsWith('[')) {
            this.recordHistory('user', spoken);
            memoryManager.addMessage({ speaker: 'user', text: spoken });
        }
        return this.sendOrQueueText(this.consumePrivateContext(text));
    }

    async sendSystemMessage(text: string) {
        auditBus.publish('gemini-out', `System → DM: ${text.slice(0, 90)}`, text);
        return this.sendPrivateSystemNote(text);
    }

    private attemptReconnect() {
        if (this.isDisconnected) {
            log.info('🔌 Live DM has been explicitly disconnected; aborting reconnect.');
            return;
        }

        // Detect if the previous connection was stable or an "instant close"
        const connectionLivedMs = Date.now() - this._lastConnectTime;
        if (connectionLivedMs > 5000 && this._lastConnectTime > 0) {
            log.info(`⚡ Connection was stable for ${connectionLivedMs}ms before drop, resetting reconnect attempts.`);
            this.reconnectAttempts = 0;
            // LM1 (contre-audit) — consommer le timestamp APRÈS la décision :
            // _lastConnectTime n'est réécrit qu'à onopen, donc chaque échec
            // suivant re-mesurait la MÊME vieille session « stable » et remettait
            // le compteur à 0 — boucle infinie à 2 s, onReconnectFailed (et la
            // sauvegarde d'urgence qui y est câblée) ne partait jamais.
            this._lastConnectTime = 0;
        } else if (this.sessionResumptionHandle && this._lastConnectTime > 0) {
            // Opened then died almost immediately while resuming from a stored
            // handle → the handle is almost certainly stale/expired. Drop it so the
            // next attempt opens a FRESH session instead of looping on the bad
            // handle (the "Gemini won't connect after quitting mid-combat" bug).
            log.warn('⚠️ Live connection died <5s while resuming — clearing stale resumption handle to break the reconnect loop.');
            this.storeResumptionHandle(null);
        }

        if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.reconnectAttempts >= this.maxReconnectAttempts && this.onReconnectFailed) {
                log.error('❌ Max reconnect attempts reached. Stopping.');
                this.onReconnectFailed();
            }
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        if (this.onReconnecting) this.onReconnecting(this.reconnectAttempts, this.maxReconnectAttempts);

        const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
        // Store the handle so disconnect() can cancel a pending backoff reconnect.
        // Without this, quitting during the 2–10s window still fired connect() on a
        // torn-down DM (a contributor to the "won't connect after quitting" bug).
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.isDisconnected) {
                log.info('🔌 Reconnect scheduled timer fired, but component was disconnected. Aborting.');
                this.isReconnecting = false;
                return;
            }
            this.connect().then(() => {
                this.isReconnecting = false;
                if (this.onReconnectSuccess) this.onReconnectSuccess();
            }).catch(() => {
                this.isReconnecting = false;
                this.attemptReconnect();
            });
        }, delay);
    }

    async manualReconnect() {
        // LM5 (contre-audit) — annuler un backoff en vol AVANT tout : le timer
        // d'attemptReconnect (fenêtre 2-10 s, précisément quand le joueur clique
        // « Reconnecter ») rappelait connect() en plus de celui-ci → DEUX
        // sessions Live concurrentes, deux voix. disconnect() le faisait déjà.
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this._lastConnectTime = 0;
        this.isDisconnected = false;
        this._sendGate = false;
        const s = this.session;
        this.session = null;
        if (s) { try { s.close(); } catch (_) {} }
        this.killAudioPipeline();
        await this.resumeAudioContext();
        await this.connect();
    }

    /**
     * Synchronous nuclear kill of the entire audio pipeline.
     * Closes the send gate, stops the audio source, kills the worklet.
     */
    private killAudioPipeline() {
        // 1. SLAM the send gate shut — instant, synchronous, no messages get through after this
        this._sendGate = false;

        // 2. Stop mic tracks SYNCHRONOUSLY — this cuts the audio source at hardware level
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        // 3. Disconnect and null worklet
        if (this.inputWorklet) {
            try { this.inputWorklet.port.onmessage = null; } catch (_) {}
            try { this.inputWorklet.disconnect(); } catch (_) {}
            this.inputWorklet = null;
        }

        // 4. Close input AudioContext entirely (not suspend — close is final)
        if (this.inputContext && this.inputContext.state !== 'closed') {
            this.inputContext.close().catch(() => {});
            this.inputContext = null;
        }

        // 5. Cancel volume polling animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    disconnect() {
        this.isDisconnected = true;
        this._sendGate = false;
        this.isConnected = false;
        // Drop the stored session-resumption handle on explicit teardown (leave /
        // save switch / language change). A handle left over from an abrupt
        // mid-combat exit can be stale server-side and make the NEXT session loop
        // open→close on resume. In-session auto-reconnect uses attemptReconnect
        // (which keeps the handle), not disconnect(), so fast reconnects still work.
        this.storeResumptionHandle(null);
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const s = this.session;
        this.session = null; // Null FIRST
        if (s) { try { s.close(); } catch (_) {} }

        this.killAudioPipeline();

        // Also stop playback
        this.playingNodes.forEach(n => { try { n.stop(); } catch(_) {} });
        this.playingNodes = [];

        if (this.outputContext && this.outputContext.state !== 'closed') {
            this.outputContext.close().catch(() => {});
            this.outputContext = null;
        }
        this.outputAnalyser = null;
    }

    setMuted(muted: boolean) {
        this.isMuted = muted;
        if (this.stream) {
            this.stream.getAudioTracks().forEach(t => t.enabled = !muted);
        }
        if (muted && this.session && this.canSendRealtime()) {
            try {
                this.session.sendRealtimeInput({ audioStreamEnd: true });
            } catch {
                this._sendGate = false;
            }
        }
    }

    setMicEnabled(enabled: boolean) {
        this.setMuted(!enabled);
    }
}
export interface LiveDMListener {
    onTranscript?: (speaker: 'user' | 'dm', text: string) => void;
    onVolume?: (vol: number) => void;
    onConnectionChange?: (connected: boolean) => void;
    onReconnecting?: (attempt: number, maxAttempts: number) => void;
    onReconnectFailed?: () => void;
    onReconnectSuccess?: () => void;
    onQueueChange?: (queued: number) => void;
    onToolCall?: (toolCall: any) => Promise<any>;
}
export class LiveConnectionManager {
    private static instance: LiveConnectionManager | null = null;
    private activeDM: LiveDungeonMaster | null = null;
    private listeners = new Set<LiveDMListener>();
    private activeSaveId: string | null = null;

    private constructor() {}

    static getInstance(): LiveConnectionManager {
        if (!LiveConnectionManager.instance) {
            LiveConnectionManager.instance = new LiveConnectionManager();
        }
        return LiveConnectionManager.instance;
    }

    async connect(
        saveId: string,
        character: CharacterSheet,
        adventure: string,
        adventureManifest: string,
        language: string,
        initialHistory: { speaker: 'user' | 'dm', text: string }[],
        directorContext: string
    ): Promise<LiveDungeonMaster> {
        if (this.activeDM && this.activeSaveId === saveId && !this.activeDM.isDisconnectedState()) {
            if (this.activeDM.getLanguage() === language) {
                log.info(`🔌 Reusing active Gemini Live session for save ${saveId}`);
                this.activeDM.updateCharacter(character);
                this.activeDM.updateDirectorContext(directorContext);
                return this.activeDM;
            } else {
                log.info(`🔌 Language changed from ${this.activeDM.getLanguage()} to ${language}. Re-creating Live session.`);
                this.activeDM.disconnect();
                this.activeDM = null;
            }
        }

        if (this.activeDM) {
            log.info('🔌 Closing previous active Gemini Live session');
            this.activeDM.disconnect();
            this.activeDM = null;
        }

        log.info(`🔌 Creating new Gemini Live session for save ${saveId}`);
        this.activeSaveId = saveId;

        this.activeDM = new LiveDungeonMaster(
            character,
            adventure,
            (speaker, text) => this.listeners.forEach(l => l.onTranscript?.(speaker, text)),
            (vol) => this.listeners.forEach(l => l.onVolume?.(vol)),
            (connected) => this.listeners.forEach(l => l.onConnectionChange?.(connected)),
            language,
            initialHistory,
            adventureManifest,
            directorContext,
            (attempt, maxAttempts) => this.listeners.forEach(l => l.onReconnecting?.(attempt, maxAttempts)),
            () => this.listeners.forEach(l => l.onReconnectFailed?.()),
            () => this.listeners.forEach(l => l.onReconnectSuccess?.()),
            (queued) => this.listeners.forEach(l => l.onQueueChange?.(queued)),
            async (toolCall) => {
                for (const l of this.listeners) {
                    if (l.onToolCall) {
                        return await l.onToolCall(toolCall);
                    }
                }
                return { error: "No tool call handler registered" };
            }
        );

        await this.activeDM.connect();
        return this.activeDM;
    }

    subscribe(listener: LiveDMListener): () => void {
        this.listeners.add(listener);
        if (this.activeDM) {
            listener.onConnectionChange?.(this.activeDM.isConnectedState());
        }
        return () => {
            this.listeners.delete(listener);
        };
    }

    getActiveDM(): LiveDungeonMaster | null {
        return this.activeDM;
    }

    disconnect() {
        if (this.activeDM) {
            this.activeDM.disconnect();
            this.activeDM = null;
        }
        this.activeSaveId = null;
    }
}
