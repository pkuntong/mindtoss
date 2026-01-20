import { createClient } from '@supabase/supabase-js';
import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { Browser } from '@capacitor/browser';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Make Supabase optional - only create client if env vars are present
export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    })
    : null;

export const isSupabaseConfigured = () => !!supabase;

// Auth helper functions
export const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) {
        return { data: null, error: { message: 'Supabase is not configured' } };
    }
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
};

export const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
        return { data: null, error: { message: 'Supabase is not configured' } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

export const signInWithApple = async () => {
    if (!supabase) {
        return { data: null, error: { message: 'Supabase is not configured' } };
    }

    // Detect if running in Capacitor (iOS/Android)
    const isCapacitor = (window as any).Capacitor !== undefined;
    const isNativePlatform = isCapacitor && (window as any).Capacitor?.getPlatform?.() === 'ios';

    console.log('Apple Sign In - isCapacitor:', isCapacitor, 'isNative:', isNativePlatform);

    if (isNativePlatform) {
        // Use native Sign in with Apple for iOS
        try {
            // Check if the plugin is available
            if (!SignInWithApple || !SignInWithApple.authorize) {
                console.error('SignInWithApple plugin not available');
                throw new Error('Apple Sign In is not available. Please update the app.');
            }

            const options: SignInWithAppleOptions = {
                clientId: import.meta.env.VITE_APPLE_CLIENT_ID || 'com.mindtoss.app',
                redirectURI: `${supabaseUrl}/auth/v1/callback`,
                scopes: 'email name',
                state: Math.random().toString(36).substring(7),
                nonce: Math.random().toString(36).substring(7),
            };

            console.log('Calling SignInWithApple.authorize with options:', options);
            const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);
            console.log('Apple Sign In result:', result);

            if (!result.response?.identityToken) {
                throw new Error('No identity token received from Apple');
            }

            // Pass the identity token to Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: result.response.identityToken,
            });

            if (error) {
                console.error('Supabase signInWithIdToken error:', error);
            }

            return { data, error };
        } catch (err: any) {
            console.error('Apple Sign In error:', err);
            // If native fails, try fallback to in-app browser OAuth
            console.log('Falling back to in-app browser OAuth...');
            return await signInWithAppleViaInAppBrowser();
        }
    } else {
        // Fallback to OAuth for web
        console.log('Using OAuth fallback for web');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: window.location.origin,
            },
        });
        return { data, error };
    }
};

// Helper function for in-app browser OAuth (used on iOS when native plugin unavailable)
const signInWithAppleViaInAppBrowser = async () => {
    if (!supabase) {
        return { data: null, error: { message: 'Supabase is not configured' } };
    }

    try {
        // Get the OAuth URL from Supabase
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: 'mindtoss://',
                skipBrowserRedirect: true, // Don't auto-redirect, we'll handle it
            },
        });

        if (error || !data.url) {
            return { data: null, error: error || { message: 'Failed to get OAuth URL' } };
        }

        console.log('Opening in-app browser for OAuth:', data.url);

        // Open the OAuth URL in an in-app browser (SFSafariViewController on iOS)
        await Browser.open({
            url: data.url,
            presentationStyle: 'popover',
        });

        // The browser will redirect back to mindtoss:// which will be handled by the app
        // Return null here - the auth state change listener will handle the session
        return { data: null, error: null };
    } catch (err: any) {
        console.error('In-app browser OAuth error:', err);
        return { data: null, error: { message: err.message || 'OAuth failed' } };
    }
};

export const signOut = async () => {
    if (!supabase) {
        return { error: { message: 'Supabase is not configured' } };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getCurrentUser = async () => {
    if (!supabase) {
        return { user: null, error: { message: 'Supabase is not configured' } };
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    if (!supabase) {
        // Return a mock subscription if Supabase is not configured
        return {
            data: { subscription: null },
            unsubscribe: () => {},
        };
    }
    return supabase.auth.onAuthStateChange(callback);
};
