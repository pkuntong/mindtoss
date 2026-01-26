import { createClient } from '@supabase/supabase-js';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Define the native Apple Sign In plugin interface
interface AppleSignInResponse {
    response: {
        user: string;
        email?: string;
        givenName?: string;
        familyName?: string;
        identityToken?: string;
        authorizationCode?: string;
        state?: string;
    };
}

interface AppleSignInPlugin {
    authorize(options?: { nonce?: string; state?: string }): Promise<AppleSignInResponse>;
}

// Register the native plugin
const NativeAppleSignIn = registerPlugin<AppleSignInPlugin>('AppleSignIn');

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
    const isNativePlatform = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

    console.log('Apple Sign In - isNative:', isNativePlatform);

    if (isNativePlatform) {
        // Use native Sign in with Apple for iOS
        try {
            console.log('Calling native AppleSignIn.authorize (no nonce for native)');
            const result = await NativeAppleSignIn.authorize({});
            console.log('Apple Sign In result:', result);

            if (!result.response?.identityToken) {
                throw new Error('No identity token received from Apple');
            }

            // For native iOS Sign In with Apple, pass the identity token without nonce
            // Apple's native authentication doesn't require nonce verification by Supabase
            console.log('Calling Supabase signInWithIdToken with token length:', result.response.identityToken.length);
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: result.response.identityToken,
            });

            if (error) {
                console.error('Supabase signInWithIdToken FULL error:', error);
                console.error('Error keys:', Object.keys(error));
                console.error('Error message:', error.message);
                console.error('Error status:', error.status);
                console.error('Error name:', error.name);
                console.error('Error stringified:', JSON.stringify(error));
            } else {
                console.log('SUCCESS! User signed in:', data?.user?.email);
                // Apple only provides full name on first sign-in
                // Save it to user metadata if available
                if (result.response.givenName || result.response.familyName) {
                    const fullName = [result.response.givenName, result.response.familyName]
                        .filter(Boolean)
                        .join(' ');
                    
                    await supabase.auth.updateUser({
                        data: {
                            full_name: fullName,
                            given_name: result.response.givenName,
                            family_name: result.response.familyName,
                        }
                    });
                }
            }

            return { data, error };
        } catch (err: any) {
            console.error('Apple Sign In error:', err);
            
            // Check if user cancelled
            if (err.code === 'USER_CANCELED') {
                return { data: null, error: { message: 'Sign in cancelled' } };
            }
            
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
