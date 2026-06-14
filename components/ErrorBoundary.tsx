import React, { ErrorInfo, ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';

const TRANS = {
    en: {
        defaultTitle: 'Something went wrong',
        body: 'An unexpected error occurred. Your game data has been auto-saved.',
        errorDetails: 'Error details',
        retry: '⚡ Retry',
        reload: '🔄 Reload Page',
    },
    fr: {
        defaultTitle: 'Une erreur est survenue',
        body: "Une erreur inattendue s'est produite. Vos données de jeu ont été sauvegardées automatiquement.",
        errorDetails: "Détails de l'erreur",
        retry: '⚡ Réessayer',
        reload: '🔄 Recharger la page',
    },
} as const;

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary — catches render-time exceptions in the subtree
 * and shows a retry screen instead of a white page of death.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    public state: State;
    public props: Props;
    public setState: any;

    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error('🛑 [ErrorBoundary] Caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            const tr = TRANS[useGameStore.getState().language] || TRANS.en;
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
                    color: '#e2e8f0',
                    padding: '2rem',
                    fontFamily: 'system-ui, sans-serif',
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '1rem',
                        padding: '2.5rem',
                        maxWidth: '520px',
                        width: '100%',
                        textAlign: 'center',
                        backdropFilter: 'blur(12px)',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💥</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                            {this.props.fallbackTitle || tr.defaultTitle}
                        </h2>
                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            {tr.body}
                        </p>

                        {this.state.error && (
                            <details style={{
                                textAlign: 'left',
                                marginBottom: '1.5rem',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '0.5rem',
                                padding: '0.75rem 1rem',
                            }}>
                                <summary style={{ cursor: 'pointer', color: '#f59e0b', fontWeight: 600 }}>
                                    {tr.errorDetails}
                                </summary>
                                <pre style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.75rem',
                                    color: '#ef4444',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}>
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.errorInfo?.componentStack?.slice(0, 500)}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    padding: '0.75rem 2rem',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    transition: 'transform 0.15s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                {tr.retry}
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '0.75rem 2rem',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    transition: 'transform 0.15s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                {tr.reload}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
