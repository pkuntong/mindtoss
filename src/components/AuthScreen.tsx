import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithApple } from '../lib/supabase';

interface AuthScreenProps {
    onAuthSuccess: () => void;
    isDarkMode: boolean;
}

const COLORS = {
    primary: '#FF6B35',
    primaryDark: '#E55A2B',
    background: '#FFFFFF',
    backgroundDark: '#1A1A1A',
    card: '#F8F9FA',
    cardDark: '#2D2D2D',
    text: '#2D3436',
    textLight: '#636E72',
    textDark: '#FFFFFF',
    error: '#D63031',
    border: '#DFE6E9',
    borderDark: '#404040',
};

export default function AuthScreen({ onAuthSuccess, isDarkMode }: AuthScreenProps) {
    const [mode, setMode] = useState<'welcome' | 'login' | 'signup'>('welcome');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const theme = {
        background: isDarkMode ? COLORS.backgroundDark : COLORS.background,
        card: isDarkMode ? COLORS.cardDark : COLORS.card,
        text: isDarkMode ? COLORS.textDark : COLORS.text,
        textLight: isDarkMode ? '#B2BEC3' : COLORS.textLight,
        border: isDarkMode ? COLORS.borderDark : COLORS.border,
    };

    const handleEmailLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setLoading(true);
        setError('');
        const { error: authError } = await signInWithEmail(email, password);
        setLoading(false);
        if (authError) {
            setError(authError.message);
        } else {
            onAuthSuccess();
        }
    };

    const handleEmailSignup = async () => {
        if (!email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        setError('');
        const { error: authError } = await signUpWithEmail(email, password);
        setLoading(false);
        if (authError) {
            setError(authError.message);
        } else {
            onAuthSuccess();
        }
    };

    const handleAppleSignIn = async () => {
        setLoading(true);
        setError('');
        const { error: authError } = await signInWithApple();
        setLoading(false);
        if (authError) {
            setError(authError.message);
        }
    };

    const styles: { [key: string]: React.CSSProperties } = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: theme.background,
            padding: 24,
        },
        welcomeContainer: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: COLORS.primary,
            padding: 24,
            justifyContent: 'center',
            alignItems: 'center',
        },
        iconCircle: {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            overflow: 'hidden',
        },
        mascotImage: {
            width: 100,
            height: 100,
            objectFit: 'contain' as const,
        },
        welcomeTitle: {
            fontSize: 32,
            fontWeight: 800,
            color: '#FFF',
            textAlign: 'center',
            marginBottom: 8,
        },
        welcomeSubtitle: {
            fontSize: 16,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            marginBottom: 48,
        },
        authButton: {
            width: '100%',
            padding: 16,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 12,
            cursor: 'pointer',
            border: 'none',
            fontSize: 16,
            fontWeight: 600,
        },
        appleButton: {
            backgroundColor: '#000',
            color: '#FFF',
        },
        emailButton: {
            backgroundColor: '#FFF',
            color: COLORS.primary,
        },
        signupLink: {
            marginTop: 16,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 14,
            textAlign: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: 32,
        },
        backButton: {
            background: 'none',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
        },
        title: {
            fontSize: 28,
            fontWeight: 700,
            color: theme.text,
            marginLeft: 12,
        },
        inputGroup: {
            marginBottom: 16,
        },
        label: {
            fontSize: 14,
            fontWeight: 600,
            color: theme.textLight,
            marginBottom: 8,
            display: 'block',
        },
        inputWrapper: {
            display: 'flex',
            alignItems: 'center',
            backgroundColor: theme.card,
            borderRadius: 12,
            padding: '0 16px',
            border: `1px solid ${theme.border}`,
        },
        input: {
            flex: 1,
            padding: '16px 12px',
            fontSize: 16,
            border: 'none',
            background: 'none',
            color: theme.text,
            outline: 'none',
        },
        errorText: {
            color: COLORS.error,
            fontSize: 14,
            marginBottom: 16,
            textAlign: 'center',
        },
        submitButton: {
            width: '100%',
            padding: 16,
            borderRadius: 12,
            backgroundColor: COLORS.primary,
            color: '#FFF',
            fontSize: 16,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            marginTop: 8,
        },
        divider: {
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0',
        },
        dividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: theme.border,
        },
        dividerText: {
            padding: '0 16px',
            color: theme.textLight,
            fontSize: 14,
        },
        switchText: {
            textAlign: 'center',
            color: theme.textLight,
            fontSize: 14,
            marginTop: 24,
        },
        switchLink: {
            color: COLORS.primary,
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
        },
    };

    if (mode === 'welcome') {
        return (
            <div style={styles.welcomeContainer}>
                <div style={styles.iconCircle}>
                    <img src="/assets/favicon.png" alt="MindToss" style={styles.mascotImage} />
                </div>
                <h1 style={styles.welcomeTitle}>MindToss</h1>
                <p style={styles.welcomeSubtitle}>Capture your thoughts instantly</p>

                <button
                    style={{ ...styles.authButton, ...styles.appleButton }}
                    onClick={handleAppleSignIn}
                    disabled={loading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Continue with Apple
                </button>

                <button
                    style={{ ...styles.authButton, ...styles.emailButton }}
                    onClick={() => setMode('login')}
                >
                    <Mail size={20} color={COLORS.primary} />
                    Continue with Email
                </button>

                <button style={styles.signupLink} onClick={() => setMode('signup')}>
                    Don't have an account? <span style={{ fontWeight: 600 }}>Sign Up</span>
                </button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.backButton} onClick={() => setMode('welcome')}>
                    <ArrowLeft size={24} color={theme.text} />
                </button>
                <h1 style={styles.title}>{mode === 'login' ? 'Sign In' : 'Create Account'}</h1>
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <div style={styles.inputWrapper}>
                    <Mail size={20} color={theme.textLight} />
                    <input
                        style={styles.input}
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoCapitalize="none"
                    />
                </div>
            </div>

            <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                    <Lock size={20} color={theme.textLight} />
                    <input
                        style={styles.input}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color={theme.textLight} /> : <Eye size={20} color={theme.textLight} />}
                    </button>
                </div>
            </div>

            {mode === 'signup' && (
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Confirm Password</label>
                    <div style={styles.inputWrapper}>
                        <Lock size={20} color={theme.textLight} />
                        <input
                            style={styles.input}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <button
                style={{ ...styles.submitButton, opacity: loading ? 0.7 : 1 }}
                onClick={mode === 'login' ? handleEmailLogin : handleEmailSignup}
                disabled={loading}
            >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}>or</span>
                <div style={styles.dividerLine} />
            </div>

            <button
                style={{ ...styles.authButton, ...styles.appleButton }}
                onClick={handleAppleSignIn}
                disabled={loading}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
            </button>

            <p style={styles.switchText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button style={styles.switchLink} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
    );
}
