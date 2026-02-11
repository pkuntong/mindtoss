import { Capacitor, registerPlugin } from '@capacitor/core';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convexSiteUrl = convexUrl
  ? convexUrl.includes('.convex.cloud')
    ? convexUrl.replace('.convex.cloud', '.convex.site')
    : convexUrl
  : '';

const SESSION_TOKEN_KEY = 'mindtossConvexSessionToken';

type ApiError = { message: string };

export interface AppUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

interface Session {
  user: AppUser;
}

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

const NativeAppleSignIn = registerPlugin<AppleSignInPlugin>('AppleSignIn');

type AuthListener = (event: string, session: Session | null) => void;
const authListeners = new Set<AuthListener>();

const emitAuthState = (event: string, session: Session | null) => {
  for (const listener of authListeners) {
    listener(event, session);
  }
};

const getStoredToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    return;
  }
  localStorage.removeItem(SESSION_TOKEN_KEY);
};

const hashPassword = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const request = async <T>(
  path: string,
  options: RequestInit,
  token?: string,
): Promise<{ data: T | null; error: ApiError | null; status: number | null }> => {
  if (!convexSiteUrl) {
    return {
      data: null,
      error: { message: 'Convex is not configured' },
      status: null,
    };
  }

  try {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${convexSiteUrl}${path}`, {
      ...options,
      headers,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: { message: payload?.error || payload?.message || `Request failed (${response.status})` },
        status: response.status,
      };
    }

    return {
      data: payload as T,
      error: null,
      status: response.status,
    };
  } catch (error: any) {
    return {
      data: null,
      error: { message: error?.message || 'Network error' },
      status: null,
    };
  }
};

const fetchSession = async (): Promise<{ session: Session | null; error: ApiError | null }> => {
  const token = getStoredToken();
  if (!token) {
    return { session: null, error: null };
  }

  const { data, error, status } = await request<{ session: Session }>('/api/auth/session', { method: 'GET' }, token);

  if (error) {
    if (status === 401) {
      setStoredToken(null);
      return { session: null, error: null };
    }
    return { session: null, error };
  }

  return {
    session: data?.session ?? null,
    error: null,
  };
};

const completeSignIn = (sessionToken: string, user: AppUser) => {
  setStoredToken(sessionToken);
  const session = { user };
  emitAuthState('SIGNED_IN', session);
  return session;
};

export const convex = convexSiteUrl
  ? {
      auth: {
        getSession: async () => {
          const { session, error } = await fetchSession();
          return {
            data: { session },
            error,
          };
        },
        setSession: async (_args: { access_token: string; refresh_token: string }) => ({
          data: { session: null as Session | null },
          error: { message: 'OAuth token exchange is not used in Convex mode.' },
        }),
      },
      functions: {
        invoke: async (name: string, _options?: { method?: string }) => {
          if (name !== 'delete-account') {
            return { data: null, error: { message: `Unknown function: ${name}` } };
          }

          const token = getStoredToken();
          if (!token) {
            return { data: null, error: { message: 'Not authenticated.' } };
          }

          const { error } = await request<{ success: boolean }>(
            '/api/account/delete',
            { method: 'POST' },
            token,
          );

          if (error) {
            return { data: null, error };
          }

          setStoredToken(null);
          emitAuthState('SIGNED_OUT', null);
          return { data: { success: true }, error: null };
        },
      },
    }
  : null;

export const isConvexConfigured = () => !!convex;

export const signUpWithEmail = async (email: string, password: string) => {
  if (!convex) {
    return { data: null, error: { message: 'Convex is not configured' } };
  }

  const passwordHash = await hashPassword(password);
  const { data, error } = await request<{ user: AppUser; sessionToken: string }>('/api/auth/sign-up', {
    method: 'POST',
    body: JSON.stringify({
      email,
      passwordHash,
    }),
  });

  if (error || !data) {
    return { data: null, error: error || { message: 'Unable to create account.' } };
  }

  completeSignIn(data.sessionToken, data.user);
  return { data: { user: data.user }, error: null };
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!convex) {
    return { data: null, error: { message: 'Convex is not configured' } };
  }

  const passwordHash = await hashPassword(password);
  const { data, error } = await request<{ user: AppUser; sessionToken: string }>('/api/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify({
      email,
      passwordHash,
    }),
  });

  if (error || !data) {
    const message = error?.message || 'Invalid email or password.';
    if (message.toLowerCase().includes('invalid email or password')) {
      return {
        data: null,
        error: {
          message:
            'Invalid email or password. If this account was from Supabase, tap Sign Up once to create it in Convex.',
        },
      };
    }
    return { data: null, error: error || { message: 'Invalid email or password.' } };
  }

  completeSignIn(data.sessionToken, data.user);
  return { data: { user: data.user }, error: null };
};

export const signInWithApple = async () => {
  if (!convex) {
    return { data: null, error: { message: 'Convex is not configured' } };
  }

  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  if (!isNativeIOS) {
    return { data: null, error: { message: 'Apple Sign In is available only on iOS in this build.' } };
  }

  try {
    const result = await NativeAppleSignIn.authorize({});

    if (!result.response?.user) {
      return { data: null, error: { message: 'Apple Sign In did not return a user identifier.' } };
    }

    const { data, error } = await request<{ user: AppUser; sessionToken: string }>('/api/auth/apple', {
      method: 'POST',
      body: JSON.stringify({
        appleUserId: result.response.user,
        email: result.response.email,
        givenName: result.response.givenName,
        familyName: result.response.familyName,
      }),
    });

    if (error || !data) {
      return { data: null, error: error || { message: 'Apple sign in failed.' } };
    }

    completeSignIn(data.sessionToken, data.user);
    return { data: { user: data.user }, error: null };
  } catch (error: any) {
    if (error?.code === 'USER_CANCELED') {
      return { data: null, error: { message: 'Sign in cancelled' } };
    }
    return {
      data: null,
      error: { message: error?.message || 'Apple sign in failed.' },
    };
  }
};

export const signOut = async () => {
  if (!convex) {
    return { error: { message: 'Convex is not configured' } };
  }

  const token = getStoredToken();
  if (token) {
    await request<{ success: boolean }>('/api/auth/sign-out', { method: 'POST' }, token);
  }

  setStoredToken(null);
  emitAuthState('SIGNED_OUT', null);
  return { error: null };
};

export const getCurrentUser = async () => {
  if (!convex) {
    return { user: null, error: { message: 'Convex is not configured' } };
  }

  const { session, error } = await fetchSession();
  return {
    user: session?.user ?? null,
    error,
  };
};

export const onAuthStateChange = (callback: AuthListener) => {
  authListeners.add(callback);

  return {
    data: {
      subscription: {
        unsubscribe: () => {
          authListeners.delete(callback);
        },
      },
    },
  };
};

interface SendTossEmailRequest {
  to: string;
  subject: string;
  content: string;
  type: 'text' | 'voice' | 'photo';
  attachment?: {
    filename: string;
    content: string;
    contentType: string;
  };
}

export const sendTossEmail = async (payload: SendTossEmailRequest) =>
  request<{ success: boolean; request_id?: string }>('/api/send-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

interface RemoteAppState {
  emailAccounts: unknown[];
  history: unknown[];
  userProfile: unknown;
  categories: unknown[];
  darkMode: boolean;
}

export const loadRemoteAppState = async () => {
  if (!convex) {
    return { data: null, error: { message: 'Convex is not configured' } };
  }

  const token = getStoredToken();
  if (!token) {
    return { data: null, error: null };
  }

  const { data, error } = await request<{ state: {
    emailAccountsJson: string;
    historyJson: string;
    userProfileJson: string;
    categoriesJson: string;
    darkMode: boolean;
  } | null }>('/api/state', { method: 'GET' }, token);

  if (error || !data?.state) {
    return { data: null, error };
  }

  try {
    return {
      data: {
        emailAccounts: JSON.parse(data.state.emailAccountsJson),
        history: JSON.parse(data.state.historyJson),
        userProfile: JSON.parse(data.state.userProfileJson),
        categories: JSON.parse(data.state.categoriesJson),
        darkMode: data.state.darkMode,
      } as RemoteAppState,
      error: null,
    };
  } catch {
    return { data: null, error: { message: 'Failed to parse remote app state.' } };
  }
};

export const saveRemoteAppState = async (payload: RemoteAppState) => {
  if (!convex) {
    return { data: null, error: { message: 'Convex is not configured' } };
  }

  const token = getStoredToken();
  if (!token) {
    return { data: null, error: null };
  }

  const { data, error } = await request<{ success: boolean }>(
    '/api/state',
    {
      method: 'POST',
      body: JSON.stringify({
        emailAccountsJson: JSON.stringify(payload.emailAccounts),
        historyJson: JSON.stringify(payload.history),
        userProfileJson: JSON.stringify(payload.userProfile),
        categoriesJson: JSON.stringify(payload.categories),
        darkMode: payload.darkMode,
      }),
    },
    token,
  );

  return { data, error };
};
