import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import {
  Settings,
  Clock,
  Edit3,
  Mic,
  Camera,
  Mail,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Send,
  Trash2,
  PlusCircle,
  Moon,
  Info,
  HelpCircle,
  Shield,
  Check,
  X,
  Image as ImageIcon,
  FileText,
  Square,
  User,
  FileText as FileTextIcon,
  LogOut,
  Search,
  Tag,
} from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import { LegalPages } from './components/LegalPages';
import { supabase, signOut, onAuthStateChange, isSupabaseConfigured } from './lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

// Types
interface TossItem {
  id: string;
  type: 'text' | 'voice' | 'photo';
  content: string;
  timestamp: Date;
  sent: boolean;
  emailTo?: string;
  category?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', color: '#636E72', icon: 'folder' },
  { id: 'ideas', name: 'Ideas', color: '#6C5CE7', icon: 'lightbulb' },
  { id: 'tasks', name: 'Tasks', color: '#00B894', icon: 'check' },
  { id: 'notes', name: 'Notes', color: '#0984E3', icon: 'file' },
  { id: 'reminders', name: 'Reminders', color: '#FDCB6E', icon: 'bell' },
];

interface EmailAccount {
  id: string;
  email: string;
  alias: string;
  isDefault: boolean;
}

interface UserProfile {
  username: string;
  displayName: string;
  email: string;
}

// Constants
const COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  secondary: '#2D3436',
  background: '#FFFFFF',
  backgroundDark: '#1A1A1A',
  card: '#F8F9FA',
  cardDark: '#2D2D2D',
  text: '#2D3436',
  textLight: '#636E72',
  textDark: '#FFFFFF',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#D63031',
  border: '#DFE6E9',
  borderDark: '#404040',
};

// Play a satisfying "sent" sound effect using Web Audio API
const playSentSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create a pleasant "whoosh" + "ding" sound
    const now = audioContext.currentTime;

    // Whoosh sound (white noise with filter sweep)
    const bufferSize = audioContext.sampleRate * 0.3;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
    noiseFilter.Q.value = 0.5;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseSource.start(now);

    // Success chime (pleasant two-note melody)
    const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Play a pleasant ascending two-note chime
    playNote(880, now + 0.05, 0.2, 0.2);  // A5
    playNote(1318.5, now + 0.12, 0.3, 0.15);  // E6

    // Cleanup
    setTimeout(() => audioContext.close(), 500);
  } catch (error) {
    console.log('Sound effect not available:', error);
  }
};

// Main App Component
export default function App() {
  // Auth State
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // State
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'onboarding' | 'main' | 'settings' | 'history' | 'profile'>('auth');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'photo'>('text');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedPhotoNote, setCapturedPhotoNote] = useState('');
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0);
  const [history, setHistory] = useState<TossItem[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [sendButtonScale, setSendButtonScale] = useState(1);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: '',
    displayName: '',
    email: '',
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [viewingLegalPage, setViewingLegalPage] = useState<'support' | 'privacy' | 'terms' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pendingCategory, setPendingCategory] = useState('');

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme colors
  const theme = {
    background: isDarkMode ? COLORS.backgroundDark : COLORS.background,
    card: isDarkMode ? COLORS.cardDark : COLORS.card,
    text: isDarkMode ? COLORS.textDark : COLORS.text,
    textLight: isDarkMode ? '#B2BEC3' : COLORS.textLight,
    border: isDarkMode ? COLORS.borderDark : COLORS.border,
  };

  // Auth state listener
  useEffect(() => {
    // If Supabase is not configured, skip auth and go straight to onboarding/main
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      const hasOnboarded = localStorage.getItem('hasOnboarded');
      setCurrentScreen(hasOnboarded === 'true' ? 'main' : 'onboarding');
      return;
    }

    // Handle deep links from OAuth redirects (for Apple Sign In) and widget/share extension
    const handleAppUrl = async (event: any) => {
      const url = event.url;
      console.log('Deep link received:', url);

      // Close the in-app browser if it's open
      try {
        await Browser.close();
      } catch (e) {
        // Browser might not be open, ignore
      }

      // Handle widget and share extension deep links
      if (url) {
        const urlObj = new URL(url);
        const scheme = urlObj.protocol.replace(':', '');

        if (scheme === 'mindtoss') {
          const path = urlObj.pathname || urlObj.host;

          // Handle toss mode deep links from widget
          if (path === 'toss/text' || url.includes('mindtoss://toss/text')) {
            setCurrentScreen('main');
            setInputMode('text');
            return;
          } else if (path === 'toss/voice' || url.includes('mindtoss://toss/voice')) {
            setCurrentScreen('main');
            setInputMode('voice');
            return;
          } else if (path === 'toss/photo' || url.includes('mindtoss://toss/photo')) {
            setCurrentScreen('main');
            setInputMode('photo');
            return;
          } else if (path === 'share' || url.includes('mindtoss://share')) {
            // Handle shared content from share extension
            handleSharedContent();
            return;
          } else if (path === 'open' || url.includes('mindtoss://open')) {
            setCurrentScreen('main');
            return;
          }
        }
      }

      if (url && url.includes('#access_token=')) {
        // Handle OAuth callback
        const hashParams = new URLSearchParams(url.split('#')[1]);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && supabase) {
          // Exchange the tokens for a session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (!error && data.session) {
            setUser(data.session.user);
            const hasOnboarded = localStorage.getItem('hasOnboarded');

            // If user signed in with Apple and has email, auto-setup email account
            // This avoids asking users for information already provided by Sign in with Apple
            if (data.session.user.email && hasOnboarded !== 'true') {
              const savedEmails = localStorage.getItem('emailAccounts');
              if (!savedEmails || JSON.parse(savedEmails).length === 0) {
                // Auto-create email account from Sign in with Apple
                const autoAccount: EmailAccount = {
                  id: Date.now().toString(),
                  email: data.session.user.email,
                  alias: data.session.user.email.split('@')[0],
                  isDefault: true,
                };
                localStorage.setItem('emailAccounts', JSON.stringify([autoAccount]));
                localStorage.setItem('hasOnboarded', 'true');
                setEmailAccounts([autoAccount]);
                setCurrentScreen('main');
                return;
              }
            }

            if (data.session.user.email) {
              setNewEmail(data.session.user.email);
            }
            setCurrentScreen(hasOnboarded === 'true' ? 'main' : 'onboarding');
          }
        }
      }
    };

    // Function to handle shared content from share extension
    const handleSharedContent = async () => {
      try {
        // Try to get shared content from native storage (via Capacitor plugin or shared UserDefaults)
        // For now, we'll use localStorage as a bridge (native code should write here)
        const pendingShare = localStorage.getItem('pendingSharedToss');
        if (pendingShare) {
          const shareData = JSON.parse(pendingShare);
          localStorage.removeItem('pendingSharedToss'); // Clear after reading

          setCurrentScreen('main');
          setInputMode('text');

          if (shareData.text) {
            setTextInput(shareData.text);
          }
          if (shareData.url) {
            setTextInput((prev) => prev ? `${prev}\n\n${shareData.url}` : shareData.url);
          }
        }
      } catch (error) {
        console.error('Error handling shared content:', error);
        setCurrentScreen('main');
      }
    };

    // Check for pending shared content on app launch
    const checkPendingShare = () => {
      const pendingShare = localStorage.getItem('pendingSharedToss');
      if (pendingShare) {
        handleSharedContent();
      }
    };

    // Listen for app URL events (deep links)
    if ((window as any).Capacitor) {
      CapacitorApp.addListener('appUrlOpen', handleAppUrl);

      // Also check when app becomes active (in case share was pending)
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          checkPendingShare();
        }
      });
    }

    // Check current session
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const hasOnboarded = localStorage.getItem('hasOnboarded');

        // If user signed in with Apple and has email, auto-setup email account
        // This avoids asking users for information already provided by Sign in with Apple
        if (session.user.email && hasOnboarded !== 'true') {
          const savedEmails = localStorage.getItem('emailAccounts');
          if (!savedEmails || JSON.parse(savedEmails).length === 0) {
            // Auto-create email account from Sign in with Apple
            const autoAccount: EmailAccount = {
              id: Date.now().toString(),
              email: session.user.email,
              alias: session.user.email.split('@')[0],
              isDefault: true,
            };
            localStorage.setItem('emailAccounts', JSON.stringify([autoAccount]));
            localStorage.setItem('hasOnboarded', 'true');
            setEmailAccounts([autoAccount]);
            setCurrentScreen('main');
            setAuthLoading(false);
            return;
          }
        }

        if (session.user.email) {
          setNewEmail(session.user.email);
        }
        setCurrentScreen(hasOnboarded === 'true' ? 'main' : 'onboarding');
      } else {
        setCurrentScreen('auth');
      }
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        const hasOnboarded = localStorage.getItem('hasOnboarded');

        // If user signed in with Apple and has email, auto-setup email account
        // This avoids asking users for information already provided by Sign in with Apple
        if (session.user.email && hasOnboarded !== 'true') {
          const savedEmails = localStorage.getItem('emailAccounts');
          if (!savedEmails || JSON.parse(savedEmails).length === 0) {
            // Auto-create email account from Sign in with Apple
            const autoAccount: EmailAccount = {
              id: Date.now().toString(),
              email: session.user.email,
              alias: session.user.email.split('@')[0],
              isDefault: true,
            };
            localStorage.setItem('emailAccounts', JSON.stringify([autoAccount]));
            localStorage.setItem('hasOnboarded', 'true');
            setEmailAccounts([autoAccount]);
            setCurrentScreen('main');
            return;
          }
        }

        if (session.user.email) {
          setNewEmail(session.user.email);
        }
        setCurrentScreen(hasOnboarded === 'true' ? 'main' : 'onboarding');
      } else if (event === 'SIGNED_OUT') {
        setCurrentScreen('auth');
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if ((window as any).Capacitor) {
        CapacitorApp.removeAllListeners();
      }
    };
  }, []);

  // Load saved data on mount
  useEffect(() => {
    if (user) {
      loadSavedData();
    }
  }, [user]);

  // Initialize profile with data from Sign in with Apple or other authentication providers
  useEffect(() => {
    if (user && !userProfile.email) {
      // Get name from Sign in with Apple user metadata
      const userMetadata = user.user_metadata || {};
      const fullName = userMetadata.full_name || userMetadata.name || '';
      const givenName = userMetadata.given_name || '';

      // Use email from authenticated session
      const authEmail = user.email || '';

      let displayName = fullName || givenName || authEmail.split('@')[0] || 'User';
      let username = authEmail.split('@')[0] || 'user';

      const updatedProfile = {
        ...userProfile,
        email: authEmail,
        username: userProfile.username || username,
        displayName: userProfile.displayName || displayName,
      };
      setUserProfile(updatedProfile);
      setEditUsername(updatedProfile.username);
      setEditDisplayName(updatedProfile.displayName);
      saveUserProfile(updatedProfile);
    }
  }, [user]);

  // Also update profile email when email accounts are loaded (for backwards compatibility)
  useEffect(() => {
    if (emailAccounts.length > 0 && !userProfile.email) {
      const defaultEmail = emailAccounts[0].email;
      const updatedProfile = {
        ...userProfile,
        email: defaultEmail,
        username: userProfile.username || defaultEmail.split('@')[0] || 'user',
        displayName: userProfile.displayName || defaultEmail.split('@')[0] || 'User',
      };
      setUserProfile(updatedProfile);
      setEditUsername(updatedProfile.username);
      setEditDisplayName(updatedProfile.displayName);
      saveUserProfile(updatedProfile);
    }
  }, [emailAccounts]);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    // Don't reset duration when stopping - keep it to show the recorded length
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadSavedData = () => {
    try {
      const savedEmails = localStorage.getItem('emailAccounts');
      const savedHistory = localStorage.getItem('tossHistory');
      const savedDarkMode = localStorage.getItem('darkMode');
      const savedProfile = localStorage.getItem('userProfile');
      const savedCategories = localStorage.getItem('categories');

      if (savedEmails) setEmailAccounts(JSON.parse(savedEmails));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedDarkMode) setIsDarkMode(JSON.parse(savedDarkMode));
      if (savedCategories) setCategories(JSON.parse(savedCategories));
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setUserProfile(profile);
        setEditUsername(profile.username || '');
        setEditDisplayName(profile.displayName || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      // Clear local data on logout
      localStorage.removeItem('emailAccounts');
      localStorage.removeItem('tossHistory');
      localStorage.removeItem('hasOnboarded');
      localStorage.removeItem('userProfile');
      setEmailAccounts([]);
      setHistory([]);
      setUserProfile({ username: '', displayName: '', email: '' });
    }
  };

  const handleDeleteAccount = async () => {
    const firstConfirm = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!firstConfirm) return;

    const secondConfirm = confirm(
      'This will permanently delete all your data including your account, email settings, and toss history. Are you absolutely sure?'
    );
    if (!secondConfirm) return;

    setIsDeletingAccount(true);
    try {
      // Attempt server-side account deletion (Supabase Edge Function)
      if (supabase && user) {
        const { error: deleteError } = await supabase.functions.invoke('delete-account', {
          method: 'POST',
        });

        if (deleteError) {
          console.error('Supabase delete-account error:', deleteError);
          throw new Error(deleteError.message || 'Account deletion failed. Please try again.');
        }

        // Explicitly sign out to clear session tokens on device
        await signOut();
      }

      // Clear all local data
      localStorage.removeItem('emailAccounts');
      localStorage.removeItem('tossHistory');
      localStorage.removeItem('hasOnboarded');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('dailyTossCount');
      localStorage.removeItem('lastTossDate');
      localStorage.removeItem('darkMode');
      localStorage.removeItem('isSubscribed');
      localStorage.removeItem('categories');

      // Sign out and delete from Supabase if configured
      if (supabase && user) {
        // Note: Full account deletion requires Supabase admin API
        // For now, we sign out and clear all local data
        await signOut();
      }

      // Reset all state
      setEmailAccounts([]);
      setHistory([]);
      setUserProfile({ username: '', displayName: '', email: '' });
      setUser(null);
      setCurrentScreen('auth');

      alert('Your account has been deleted successfully.');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const saveEmailAccounts = (accounts: EmailAccount[]) => {
    try {
      localStorage.setItem('emailAccounts', JSON.stringify(accounts));
    } catch (error) {
      console.error('Error saving emails:', error);
    }
  };

  const saveHistory = (items: TossItem[]) => {
    try {
      localStorage.setItem('tossHistory', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const saveUserProfile = (profile: UserProfile) => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const updateUserProfile = () => {
    if (!editUsername.trim()) {
      alert('Username is required');
      return;
    }
    const updatedProfile: UserProfile = {
      username: editUsername.trim(),
      displayName: editDisplayName.trim() || editUsername.trim(),
      email: userProfile.email || emailAccounts[0]?.email || '',
    };
    setUserProfile(updatedProfile);
    saveUserProfile(updatedProfile);
    setEditingProfile(false);
  };

  const animateSendButton = () => {
    setSendButtonScale(0.9);
    setTimeout(() => setSendButtonScale(1), 200);
  };

  const switchMode = (mode: 'text' | 'voice' | 'photo') => {
    setInputMode(mode);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      // Reset duration when starting a new recording
      setRecordingDuration(0);
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        resolve(audioUrl);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    });
  };

  // Stop recording and get base64 data for email attachment
  const stopRecordingAndGetData = async (): Promise<{ base64: string; blob: Blob } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        // If not currently recording, check if we have existing audio chunks
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ base64, blob: audioBlob });
          };
          reader.readAsDataURL(audioBlob);
          return;
        }
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ base64, blob: audioBlob });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const takePhoto = async () => {
    try {
      const isNative = (window as any).Capacitor?.isNativePlatform?.();
      console.log('takePhoto - isNative:', isNative);

      if (!isNative) {
        // On web/simulator, use file input directly
        fileInputRef.current?.click();
        return;
      }

      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (photo.dataUrl) {
        setCapturedImage(photo.dataUrl);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      // If camera fails, fall back to file picker
      if (error.code === 'USER_CANCELED' || error.message?.includes('canceled')) {
        return; // User cancelled, do nothing
      }
      console.log('Camera failed, using file picker fallback');
      fileInputRef.current?.click();
    }
  };

  const chooseFromLibrary = async () => {
    try {
      const isNative = (window as any).Capacitor?.isNativePlatform?.();
      console.log('chooseFromLibrary - isNative:', isNative);

      if (!isNative) {
        // On web/simulator, use file input directly
        fileInputRef.current?.click();
        return;
      }

      // Try using pickImages first (more reliable for library)
      try {
        const result = await CapacitorCamera.pickImages({
          quality: 90,
          limit: 1,
        });
        if (result.photos && result.photos.length > 0) {
          const photo = result.photos[0];
          // Convert webPath to data URL
          if (photo.webPath) {
            const response = await fetch(photo.webPath);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              setCapturedImage(reader.result as string);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      } catch (pickError: any) {
        console.log('pickImages failed, trying getPhoto:', pickError.message);
        // Fall back to getPhoto
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        if (photo.dataUrl) {
          setCapturedImage(photo.dataUrl);
        }
      }
    } catch (error: any) {
      console.error('Photo picker error:', error);
      if (error.code === 'USER_CANCELED' || error.message?.includes('canceled')) {
        return;
      }
      // Fall back to file input
      console.log('Photo picker failed, using file input fallback');
      fileInputRef.current?.click();
    }
  };

  const sendToss = async () => {
    if (emailAccounts.length === 0) {
      alert('No Email: Please add an email address in settings first.');
      return;
    }

    const targetEmail = emailAccounts[selectedEmailIndex]?.email;
    if (!targetEmail) return;

    let content = '';
    let attachment: { filename: string; content: string; contentType: string } | undefined;

    if (inputMode === 'text') {
      if (!textInput.trim()) {
        alert('Empty Note: Please enter some text to toss.');
        return;
      }
      content = textInput;
    } else if (inputMode === 'voice') {
      if (!isRecording && recordingDuration === 0) {
        alert('No Recording: Please record a voice memo first.');
        return;
      }
      // Stop recording and get the audio data
      const audioData = await stopRecordingAndGetData();
      if (audioData) {
        content = `Voice memo (${formatDuration(recordingDuration)})`;
        attachment = {
          filename: `voice-memo-${Date.now()}.webm`,
          content: audioData.base64,
          contentType: 'audio/webm',
        };
      } else {
        alert('No Recording: Please record a voice memo first.');
        return;
      }
    } else if (inputMode === 'photo') {
      if (!capturedImage) {
        alert('No Photo: Please take or select a photo first.');
        return;
      }
      content = capturedPhotoNote || 'Photo capture';
      // Extract base64 from data URL
      const base64Match = capturedImage.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        attachment = {
          filename: `photo-${Date.now()}.${base64Match[1].split('/')[1] || 'jpg'}`,
          content: base64Match[2],
          contentType: base64Match[1],
        };
      }
    }

    setIsSending(true);
    animateSendButton();

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Validate email service is configured
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Email service is not configured. Please contact support.');
      }

      console.log('Sending email via Edge Function:', `${supabaseUrl}/functions/v1/send-email`);

      let response: Response;
      try {
        response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: targetEmail,
            subject: `MindToss: ${new Date().toLocaleDateString()}`,
            content: content,
            type: inputMode,
            attachment: attachment,
          }),
        });
      } catch (networkError: any) {
        console.error('Network error:', networkError);
        throw new Error('Unable to connect to email service. Please check your internet connection and try again.');
      }

      console.log('Edge Function response status:', response.status);

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Email service returned an invalid response. Please try again.');
      }

      console.log('Edge Function result:', result);

      if (!response.ok) {
        console.error('Edge Function failed:', result.error || result.message);
        // Provide user-friendly error messages based on the error type
        const errorMessage = result.error || result.message || '';
        if (errorMessage.includes('SMTP2GO_API_KEY')) {
          throw new Error('Email service configuration error. Please contact support.');
        } else if (errorMessage.includes('Missing required fields')) {
          throw new Error('Invalid email address. Please check your settings.');
        } else {
          throw new Error('Failed to send email. Please try again later.');
        }
      }

      // Add to history
      const newToss: TossItem = {
        id: Date.now().toString(),
        type: inputMode,
        content: content,
        timestamp: new Date(),
        sent: true,
        emailTo: targetEmail,
        category: pendingCategory || undefined,
      };

      const updatedHistory = [newToss, ...history].slice(0, 100);
      setHistory(updatedHistory);
      saveHistory(updatedHistory);

      // Clear inputs
      setTextInput('');
      setCapturedImage(null);
      setCapturedPhotoNote('');
      setRecordingDuration(0);
      setPendingCategory('');

      // Play sent sound effect
      playSentSound();

      // Show success feedback
      alert('Sent! Your thought has been tossed to your inbox.');

    } catch (error: any) {
      console.error('Send error:', error);
      alert(`Error: ${error.message || 'Failed to send toss. Please try again.'}`);
    } finally {
      setIsSending(false);
    }
  };

  const addEmailAccount = () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      alert('Invalid Email: Please enter a valid email address.');
      return;
    }

    const newAccount: EmailAccount = {
      id: Date.now().toString(),
      email: newEmail.trim(),
      alias: newAlias.trim() || newEmail.split('@')[0],
      isDefault: emailAccounts.length === 0,
    };

    const updated = [...emailAccounts, newAccount];
    setEmailAccounts(updated);
    saveEmailAccounts(updated);
    setNewEmail('');
    setNewAlias('');
    setShowEmailModal(false);
  };

  const removeEmailAccount = (id: string) => {
    if (confirm('Are you sure you want to remove this email?')) {
      const updated = emailAccounts.filter(e => e.id !== id);
      setEmailAccounts(updated);
      saveEmailAccounts(updated);
      if (selectedEmailIndex >= updated.length) {
        setSelectedEmailIndex(Math.max(0, updated.length - 1));
      }
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('hasOnboarded', 'true');
    setCurrentScreen('main');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Styles
  const styles: { [key: string]: CSSProperties } = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: theme.background,
      transition: 'background-color 0.3s ease',
    },
    // Onboarding
    onboardingContainer: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: COLORS.primary,
      padding: 24,
      justifyContent: 'space-between',
    },
    progressDots: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    onboardingContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
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
    },
    onboardingTitle: {
      fontSize: 32,
      fontWeight: 800,
      color: '#FFF',
      textAlign: 'center',
      marginBottom: 8,
    },
    onboardingSubtitle: {
      fontSize: 18,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: 16,
    },
    onboardingDescription: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      lineHeight: 1.5,
      paddingLeft: 20,
      paddingRight: 20,
    },
    onboardingEmailInput: {
      width: '100%',
      marginTop: 32,
    },
    emailInputOnboarding: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
      padding: 16,
      fontSize: 18,
      color: '#FFF',
      textAlign: 'center' as const,
      width: '100%',
    },
    onboardingNav: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    onboardingBackBtn: {
      padding: 12,
      color: '#FFF',
      background: 'transparent',
    },
    onboardingNextBtn: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#FFF',
      paddingLeft: 24,
      paddingRight: 24,
      paddingTop: 14,
      paddingBottom: 14,
      borderRadius: 30,
      gap: 8,
      marginLeft: 'auto',
    },
    onboardingNextText: {
      fontSize: 16,
      fontWeight: 700,
      color: COLORS.primary,
    },
    skipBtn: {
      alignSelf: 'center',
      padding: 12,
      marginTop: 12,
      background: 'transparent',
    },
    skipText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.7)',
    },
    // Header
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: 20,
      paddingRight: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    logo: {
      height: 36,
      objectFit: 'contain' as const,
    },
    // Email Selector
    emailSelector: {
      display: 'flex',
      alignItems: 'center',
      alignSelf: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 8,
      paddingBottom: 8,
      borderRadius: 20,
      gap: 8,
      marginBottom: 16,
      background: 'transparent',
      backgroundColor: theme.card,
    },
    emailSelectorText: {
      fontSize: 14,
      fontWeight: 500,
      maxWidth: 200,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      color: theme.text,
    },
    // Mode Tabs
    modeTabs: {
      display: 'flex',
      marginLeft: 20,
      marginRight: 20,
      borderRadius: 16,
      padding: 4,
      position: 'relative' as const,
      backgroundColor: theme.card,
    },
    modeIndicator: {
      position: 'absolute' as const,
      width: 'calc(33.33% - 2.67px)',
      height: 'calc(100% - 8px)',
      backgroundColor: COLORS.primary,
      borderRadius: 12,
      top: 4,
      transition: 'left 0.3s ease',
    },
    modeTab: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
      gap: 4,
      zIndex: 1,
      background: 'transparent',
    },
    modeTabText: {
      fontSize: 12,
      fontWeight: 600,
    },
    // Input Area
    inputArea: {
      flex: 1,
      paddingLeft: 20,
      paddingRight: 20,
      paddingTop: 20,
      display: 'flex',
      flexDirection: 'column' as const,
    },
    textInputContainer: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      flexDirection: 'column' as const,
      backgroundColor: theme.card,
    },
    textInput: {
      flex: 1,
      fontSize: 18,
      lineHeight: 1.5,
      resize: 'none' as const,
      backgroundColor: 'transparent',
      color: theme.text,
    },
    charCount: {
      fontSize: 12,
      textAlign: 'right' as const,
      marginTop: 8,
      color: theme.textLight,
    },
    // Voice Recording
    voiceContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordingCircle: {
      width: 150,
      height: 150,
      borderRadius: 75,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      transition: 'transform 0.3s ease, background-color 0.3s ease',
    },
    recordButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      width: '100%',
      height: '100%',
    },
    recordingText: {
      fontSize: 24,
      fontWeight: 700,
      marginTop: 24,
      color: theme.text,
    },
    recordingHint: {
      fontSize: 14,
      marginTop: 8,
      color: theme.textLight,
    },
    clearRecordingBtn: {
      marginTop: 16,
      padding: '10px 20px',
      backgroundColor: 'transparent',
      border: `1px solid ${theme.textLight}`,
      borderRadius: 20,
      color: theme.textLight,
      fontSize: 14,
      cursor: 'pointer',
    },
    // Photo
    photoContainer: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoButtons: {
      display: 'flex',
      gap: 20,
    },
    photoBtn: {
      width: 130,
      height: 130,
      borderRadius: 20,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.card,
    },
    photoBtnText: {
      fontSize: 14,
      fontWeight: 600,
      color: theme.text,
    },
    imagePreviewContainer: {
      position: 'relative' as const,
    },
    imagePreview: {
      width: 280,
      height: 280,
      borderRadius: 20,
      objectFit: 'cover' as const,
    },
    removeImageBtn: {
      position: 'absolute' as const,
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoNoteInput: {
      width: '100%',
      marginTop: 12,
      padding: '12px 16px',
      borderRadius: 12,
      backgroundColor: theme.card,
      color: theme.text,
      fontSize: 16,
      border: `1px solid ${theme.border}`,
    },
    // Category Picker
    categoryPickerRow: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 12,
    },
    categoryPickerBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 14px',
      borderRadius: 20,
      backgroundColor: theme.card,
      border: 'none',
      cursor: 'pointer',
    },
    categoryPickerText: {
      fontSize: 13,
      fontWeight: 500,
    },
    categoryDropdown: {
      marginLeft: 20,
      marginRight: 20,
      marginTop: 8,
      borderRadius: 12,
      backgroundColor: theme.card,
      overflow: 'hidden',
    },
    categoryDropdownItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      width: '100%',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
    },
    categoryDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    categoryDropdownText: {
      flex: 1,
      fontSize: 14,
      fontWeight: 500,
      color: theme.text,
      textAlign: 'left' as const,
    },
    // Send Button
    sendContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 20,
      paddingBottom: 20,
    },
    sendButton: {
      width: 180,
      height: 60,
      borderRadius: 30,
      overflow: 'hidden',
      transition: 'transform 0.2s ease, opacity 0.2s ease',
    },
    sendGradient: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
    },
    sendButtonText: {
      fontSize: 20,
      fontWeight: 800,
      color: '#FFF',
      letterSpacing: 2,
    },
    // Recent History
    recentHistory: {
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 20,
    },
    recentTitle: {
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      color: theme.textLight,
    },
    recentScroll: {
      display: 'flex',
      overflowX: 'auto' as const,
      gap: 8,
    },
    recentItem: {
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 8,
      paddingBottom: 8,
      borderRadius: 12,
      gap: 8,
      maxWidth: 200,
      flexShrink: 0,
      backgroundColor: theme.card,
    },
    recentItemText: {
      fontSize: 13,
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      color: theme.text,
    },
    // Settings
    settingsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: 20,
      paddingRight: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    settingsTitle: {
      fontSize: 20,
      fontWeight: 700,
      color: theme.text,
    },
    settingsList: {
      flex: 1,
      paddingLeft: 20,
      paddingRight: 20,
      overflowY: 'auto' as const,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 600,
      marginTop: 24,
      marginBottom: 8,
      letterSpacing: 1,
      color: theme.textLight,
    },
    settingsCard: {
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.card,
    },
    settingRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      background: 'transparent',
      width: '100%',
      textAlign: 'left' as const,
    },
    settingInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    settingLabel: {
      fontSize: 16,
      color: theme.text,
    },
    settingValue: {
      fontSize: 14,
      color: theme.textLight,
    },
    settingSubtext: {
      fontSize: 13,
      marginTop: 4,
      color: theme.textLight,
    },
    editButton: {
      background: 'transparent',
      padding: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    emailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottom: '1px solid rgba(0,0,0,0.05)',
    },
    emailInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      background: 'transparent',
      textAlign: 'left' as const,
    },
    emailRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      border: `2px solid ${COLORS.border}`,
    },
    emailRadioSelected: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary,
    },
    emailAlias: {
      fontSize: 16,
      fontWeight: 600,
      color: theme.text,
    },
    emailAddress: {
      fontSize: 13,
      marginTop: 2,
      color: theme.textLight,
    },
    addEmailBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
      width: '100%',
      background: 'transparent',
    },
    addEmailText: {
      fontSize: 16,
      fontWeight: 600,
      color: COLORS.primary,
    },
    // Modal
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 1000,
    },
    modalContent: {
      width: '100%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      backgroundColor: theme.background,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 20,
      textAlign: 'center' as const,
      color: theme.text,
    },
    modalInput: {
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      marginBottom: 12,
      width: '100%',
      backgroundColor: theme.card,
      color: theme.text,
    },
    modalButtons: {
      display: 'flex',
      gap: 12,
      marginTop: 12,
    },
    modalCancelBtn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: COLORS.border,
      textAlign: 'center' as const,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: 600,
      color: COLORS.textLight,
    },
    modalAddBtn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: COLORS.primary,
      textAlign: 'center' as const,
    },
    modalAddText: {
      fontSize: 16,
      fontWeight: 600,
      color: '#FFF',
    },
    // Search
    searchContainer: {
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 12,
    },
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: '12px 16px',
      gap: 12,
    },
    searchInput: {
      flex: 1,
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: 16,
      color: theme.text,
      outline: 'none',
    },
    clearSearchBtn: {
      background: 'transparent',
      padding: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Category Filter
    categoryFilter: {
      display: 'flex',
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 12,
      gap: 8,
      overflowX: 'auto' as const,
    },
    categoryChip: {
      paddingLeft: 14,
      paddingRight: 14,
      paddingTop: 8,
      paddingBottom: 8,
      borderRadius: 20,
      border: '2px solid',
      flexShrink: 0,
      cursor: 'pointer',
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: 600,
    },
    categoryBadge: {
      fontSize: 10,
      fontWeight: 600,
      color: '#FFF',
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 2,
      paddingBottom: 2,
      borderRadius: 10,
      marginLeft: 8,
    },
    resultsCount: {
      fontSize: 12,
      color: theme.textLight,
      paddingLeft: 20,
      paddingBottom: 8,
    },
    // History
    emptyHistory: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyHistoryText: {
      fontSize: 18,
      fontWeight: 600,
      marginTop: 16,
      color: theme.textLight,
    },
    emptyHistorySubtext: {
      fontSize: 14,
      marginTop: 8,
      color: theme.textLight,
    },
    historyList: {
      padding: 20,
      overflowY: 'auto' as const,
      flex: 1,
    },
    historyItem: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      backgroundColor: theme.card,
    },
    historyItemHeader: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    historyTypeIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: COLORS.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyItemInfo: {
      flex: 1,
    },
    historyItemContent: {
      fontSize: 15,
      fontWeight: 500,
      marginBottom: 4,
      color: theme.text,
    },
    historyItemMetaRow: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
    },
    historyItemMeta: {
      fontSize: 12,
      color: theme.textLight,
    },
    sentBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: COLORS.success,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Subscription
    subscriptionContent: {
      flex: 1,
      overflowY: 'auto' as const,
    },
    subscriptionHero: {
      marginLeft: 20,
      marginRight: 20,
      borderRadius: 24,
      overflow: 'hidden',
      marginTop: 20,
    },
    subscriptionHeroBg: {
      padding: 32,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
    },
    subscriptionHeroTitle: {
      fontSize: 28,
      fontWeight: 800,
      color: '#FFF',
      marginTop: 16,
    },
    subscriptionHeroSubtitle: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.9)',
      marginTop: 8,
      textAlign: 'center' as const,
    },
    plansContainer: {
      padding: 20,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 16,
    },
    planCard: {
      borderRadius: 20,
      padding: 24,
      border: `2px solid ${theme.border}`,
      position: 'relative' as const,
      backgroundColor: theme.card,
      cursor: 'pointer',
    },
    saveBadge: {
      position: 'absolute' as const,
      top: -10,
      right: 16,
      backgroundColor: COLORS.success,
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 4,
      paddingBottom: 4,
      borderRadius: 12,
    },
    saveBadgeText: {
      fontSize: 11,
      fontWeight: 700,
      color: '#FFF',
    },
    planName: {
      fontSize: 20,
      fontWeight: 700,
      color: theme.text,
    },
    planPriceRow: {
      display: 'flex',
      alignItems: 'baseline',
      marginTop: 8,
    },
    planPrice: {
      fontSize: 36,
      fontWeight: 800,
      color: COLORS.primary,
    },
    planPeriod: {
      fontSize: 16,
      marginLeft: 4,
      color: theme.textLight,
    },
    planFeatures: {
      marginTop: 20,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 12,
    },
    planFeatureRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    planFeatureText: {
      fontSize: 15,
      color: theme.text,
    },
    restoreBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'transparent',
      width: '100%',
    },
    restoreText: {
      fontSize: 16,
      fontWeight: 600,
      color: COLORS.primary,
    },
    termsText: {
      fontSize: 12,
      textAlign: 'center' as const,
      paddingLeft: 32,
      paddingRight: 32,
      paddingBottom: 32,
      lineHeight: 1.5,
      color: theme.textLight,
    },
    // Toggle Switch
    toggleSwitch: {
      width: 50,
      height: 28,
      borderRadius: 14,
      padding: 2,
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    },
    toggleKnob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFF',
      transition: 'transform 0.3s ease',
    },
    iconButton: {
      background: 'transparent',
      padding: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };

  // Render Onboarding Screen
  const renderOnboarding = () => {
    const steps = [
      {
        title: 'Welcome to MindToss',
        subtitle: "Don't forget a thing!",
        description: 'Capture your thoughts instantly and send them straight to your inbox.',
        icon: null, // Use mascot image instead
        useMascot: true,
      },
      {
        title: 'Speak, Snap, or Type',
        subtitle: 'Multiple capture modes',
        description: 'Use voice memos, take photos, or type quick notes - whatever works for you.',
        icon: Mic,
      },
      {
        title: 'Straight to Your Inbox',
        subtitle: 'No categorizing needed',
        description: 'Your thoughts go directly to your email for processing later with GTD or Inbox Zero.',
        icon: Mail,
      },
      {
        title: 'Confirm Your Email',
        subtitle: 'One-time setup',
        description: user?.email
          ? 'We detected your email from Sign in with Apple. We will use it to send your tosses unless you choose a different one.'
          : 'Enter the email address where you want to receive your tosses.',
        icon: Settings,
        showEmailInput: !user?.email,
      },
    ];

    const currentStep = steps[onboardingStep] as any;
    const IconComponent = currentStep.icon;

    return (
      <div style={styles.onboardingContainer}>
        {/* Progress dots */}
        <div style={styles.progressDots}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.progressDot,
                backgroundColor: index <= onboardingStep ? '#FFF' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.onboardingContent}>
          <div style={styles.iconCircle}>
            {currentStep.useMascot ? (
              <img src="/assets/favicon.png" alt="MindToss" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            ) : (
              <IconComponent size={60} color={COLORS.primary} />
            )}
          </div>

          <h1 style={styles.onboardingTitle}>{currentStep.title}</h1>
          <p style={styles.onboardingSubtitle}>{currentStep.subtitle}</p>
          <p style={styles.onboardingDescription}>{currentStep.description}</p>

          {currentStep.showEmailInput && (
            <div style={styles.onboardingEmailInput}>
              <input
                style={styles.emailInputOnboarding}
                placeholder="your@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={styles.onboardingNav}>
          {onboardingStep > 0 && (
            <button
              style={styles.onboardingBackBtn}
              onClick={() => setOnboardingStep(prev => prev - 1)}
            >
              <ArrowLeft size={24} color="#FFF" />
            </button>
          )}

          <button
            style={styles.onboardingNextBtn}
            onClick={() => {
              if (onboardingStep === steps.length - 1) {
                const emailToUse = (newEmail.trim() || user?.email || '').trim();
                if (emailToUse.includes('@')) {
                  const newAccount: EmailAccount = {
                    id: Date.now().toString(),
                    email: emailToUse,
                    alias: emailToUse.split('@')[0],
                    isDefault: true,
                  };
                  setEmailAccounts([newAccount]);
                  saveEmailAccounts([newAccount]);
                  completeOnboarding();
                } else {
                  alert('Email Required: Please enter a valid email address.');
                }
              } else {
                setOnboardingStep(prev => prev + 1);
              }
            }}
          >
            <span style={styles.onboardingNextText}>
              {onboardingStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </span>
            <ArrowRight size={20} color={COLORS.primary} />
          </button>
        </div>

        {onboardingStep < steps.length - 1 && (
          <button
            style={styles.skipBtn}
            onClick={() => setOnboardingStep(steps.length - 1)}
          >
            <span style={styles.skipText}>Skip</span>
          </button>
        )}
      </div>
    );
  };

  // Render Main Screen
  const renderMainScreen = () => {
    const modePosition = inputMode === 'text' ? 4 : inputMode === 'voice' ? 'calc(33.33% + 1.33px)' : 'calc(66.66% + 2.67px)';

    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.iconButton} onClick={() => setCurrentScreen('settings')}>
            <Settings size={26} color={theme.text} />
          </button>

          <img
            src="/assets/logo.png"
            style={styles.logo}
            alt="MindToss"
          />

          <button style={styles.iconButton} onClick={() => setCurrentScreen('history')}>
            <Clock size={26} color={theme.text} />
          </button>
        </div>

        {/* Email Selector */}
        {emailAccounts.length > 0 && (
          <button
            style={styles.emailSelector}
            onClick={() => {
              const nextIndex = (selectedEmailIndex + 1) % emailAccounts.length;
              setSelectedEmailIndex(nextIndex);
            }}
          >
            <Mail size={18} color={COLORS.primary} />
            <span style={styles.emailSelectorText}>
              {emailAccounts[selectedEmailIndex]?.alias || emailAccounts[selectedEmailIndex]?.email}
            </span>
            {emailAccounts.length > 1 && (
              <ChevronDown size={16} color={theme.textLight} />
            )}
          </button>
        )}

        {/* Mode Tabs */}
        <div style={styles.modeTabs}>
          <div
            style={{
              ...styles.modeIndicator,
              left: modePosition,
            }}
          />

          <button
            style={styles.modeTab}
            onClick={() => switchMode('text')}
          >
            <Edit3 size={22} color={inputMode === 'text' ? '#FFF' : theme.textLight} />
            <span style={{ ...styles.modeTabText, color: inputMode === 'text' ? '#FFF' : theme.textLight }}>
              Note
            </span>
          </button>

          <button
            style={styles.modeTab}
            onClick={() => switchMode('voice')}
          >
            <Mic size={22} color={inputMode === 'voice' ? '#FFF' : theme.textLight} />
            <span style={{ ...styles.modeTabText, color: inputMode === 'voice' ? '#FFF' : theme.textLight }}>
              Voice
            </span>
          </button>

          <button
            style={styles.modeTab}
            onClick={() => switchMode('photo')}
          >
            <Camera size={22} color={inputMode === 'photo' ? '#FFF' : theme.textLight} />
            <span style={{ ...styles.modeTabText, color: inputMode === 'photo' ? '#FFF' : theme.textLight }}>
              Photo
            </span>
          </button>
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          {inputMode === 'text' && (
            <div style={styles.textInputContainer}>
              <textarea
                style={styles.textInput}
                placeholder="What's on your mind?"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
              />
              <span style={styles.charCount}>
                {textInput.length} characters
              </span>
            </div>
          )}

          {inputMode === 'voice' && (
            <div style={styles.voiceContainer}>
              <div
                style={{
                  ...styles.recordingCircle,
                  backgroundColor: isRecording ? COLORS.error : (recordingDuration > 0 && !isRecording) ? COLORS.success : theme.card,
                  transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <button
                  style={styles.recordButton}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <Square size={50} color="#FFF" fill="#FFF" />
                  ) : recordingDuration > 0 ? (
                    <Mic size={50} color="#FFF" />
                  ) : (
                    <Mic size={50} color={COLORS.primary} />
                  )}
                </button>
              </div>

              <p style={styles.recordingText}>
                {isRecording ? formatDuration(recordingDuration) :
                  recordingDuration > 0 ? `Ready (${formatDuration(recordingDuration)})` : 'Tap to record'}
              </p>
              <p style={styles.recordingHint}>
                {isRecording ? 'Tap stop when done' :
                  recordingDuration > 0 ? 'Tap TOSS to send or record again' : 'Tap the microphone to start'}
              </p>
              {recordingDuration > 0 && !isRecording && (
                <button
                  style={styles.clearRecordingBtn}
                  onClick={() => { audioChunksRef.current = []; setRecordingDuration(0); }}
                >
                  Clear Recording
                </button>
              )}
            </div>
          )}

          {inputMode === 'photo' && (
            <div style={styles.photoContainer}>
              {capturedImage ? (
                <div style={styles.imagePreviewContainer}>
                  <img src={capturedImage} style={styles.imagePreview} alt="Captured" />
                  <button
                    style={styles.removeImageBtn}
                    onClick={() => { setCapturedImage(null); setCapturedPhotoNote(''); }}
                  >
                    <X size={24} color="#FFF" />
                  </button>
                  <input
                    type="text"
                    style={styles.photoNoteInput}
                    placeholder="Add a note (optional)..."
                    value={capturedPhotoNote}
                    onChange={(e) => setCapturedPhotoNote(e.target.value)}
                  />
                </div>
              ) : (
                <div style={styles.photoButtons}>
                  <button
                    style={styles.photoBtn}
                    onClick={takePhoto}
                  >
                    <Camera size={36} color={COLORS.primary} />
                    <span style={styles.photoBtnText}>Take Photo</span>
                  </button>
                  <button
                    style={styles.photoBtn}
                    onClick={chooseFromLibrary}
                  >
                    <ImageIcon size={36} color={COLORS.primary} />
                    <span style={styles.photoBtnText}>Library</span>
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
            </div>
          )}
        </div>

        {/* Category Picker */}
        <div style={styles.categoryPickerRow}>
          <button
            style={styles.categoryPickerBtn}
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Tag size={16} color={pendingCategory ? categories.find(c => c.id === pendingCategory)?.color : theme.textLight} />
            <span style={{
              ...styles.categoryPickerText,
              color: pendingCategory ? categories.find(c => c.id === pendingCategory)?.color : theme.textLight
            }}>
              {pendingCategory ? categories.find(c => c.id === pendingCategory)?.name : 'Add category'}
            </span>
            <ChevronDown size={14} color={theme.textLight} />
          </button>
        </div>

        {/* Category Dropdown */}
        {showCategoryPicker && (
          <div style={styles.categoryDropdown}>
            {categories.filter(c => c.id !== 'all').map((cat) => (
              <button
                key={cat.id}
                style={{
                  ...styles.categoryDropdownItem,
                  backgroundColor: pendingCategory === cat.id ? `${cat.color}20` : 'transparent',
                }}
                onClick={() => {
                  setPendingCategory(pendingCategory === cat.id ? '' : cat.id);
                  setShowCategoryPicker(false);
                }}
              >
                <div style={{ ...styles.categoryDot, backgroundColor: cat.color }} />
                <span style={styles.categoryDropdownText}>{cat.name}</span>
                {pendingCategory === cat.id && <Check size={16} color={cat.color} />}
              </button>
            ))}
          </div>
        )}

        {/* Send Button */}
        <div style={styles.sendContainer}>
          <button
            style={{
              ...styles.sendButton,
              transform: `scale(${sendButtonScale})`,
              opacity: isSending ? 0.7 : 1,
            }}
            onClick={sendToss}
            disabled={isSending}
          >
            <div style={styles.sendGradient}>
              {isSending ? (
                <div style={{ width: 28, height: 28, border: '3px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Send size={28} color="#FFF" />
                  <span style={styles.sendButtonText}>TOSS</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Recent History Preview */}
        {history.length > 0 && (
          <div style={styles.recentHistory}>
            <p style={styles.recentTitle}>Recent</p>
            <div style={styles.recentScroll}>
              {history.slice(0, 5).map((item) => (
                <div key={item.id} style={styles.recentItem}>
                  {item.type === 'text' ? (
                    <FileText size={16} color={COLORS.primary} />
                  ) : item.type === 'voice' ? (
                    <Mic size={16} color={COLORS.primary} />
                  ) : (
                    <ImageIcon size={16} color={COLORS.primary} />
                  )}
                  <span style={styles.recentItemText}>
                    {item.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Settings Screen
  const renderSettings = () => (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.settingsHeader}>
        <button style={styles.iconButton} onClick={() => setCurrentScreen('main')}>
          <ArrowLeft size={26} color={theme.text} />
        </button>
        <span style={styles.settingsTitle}>Settings</span>
        <div style={{ width: 42 }} />
      </div>

      <div style={styles.settingsList}>
        {/* Profile Section */}
        <p style={styles.sectionTitle}>PROFILE</p>
        <div style={styles.settingsCard}>
          <button
            style={styles.settingRow}
            onClick={() => {
              setEditUsername(userProfile.username);
              setEditDisplayName(userProfile.displayName);
              setCurrentScreen('profile');
            }}
          >
            <div style={styles.settingInfo}>
              <User size={22} color={COLORS.primary} />
              <div>
                <span style={styles.settingLabel}>Profile</span>
                <p style={styles.settingSubtext}>{userProfile.displayName || userProfile.username || 'Not set'}</p>
              </div>
            </div>
            <ChevronRight size={20} color={theme.textLight} />
          </button>
        </div>

        {/* Email Accounts Section */}
        <p style={styles.sectionTitle}>EMAIL ACCOUNTS</p>
        <div style={styles.settingsCard}>
          {emailAccounts.map((account, index) => (
            <div key={account.id} style={styles.emailRow}>
              <button
                style={styles.emailInfo}
                onClick={() => setSelectedEmailIndex(index)}
              >
                <div style={{
                  ...styles.emailRadio,
                  ...(selectedEmailIndex === index ? styles.emailRadioSelected : {}),
                }} />
                <div>
                  <p style={styles.emailAlias}>{account.alias}</p>
                  <p style={styles.emailAddress}>{account.email}</p>
                </div>
              </button>
              <button style={styles.iconButton} onClick={() => removeEmailAccount(account.id)}>
                <Trash2 size={20} color={COLORS.error} />
              </button>
            </div>
          ))}

          <button
            style={styles.addEmailBtn}
            onClick={() => setShowEmailModal(true)}
          >
            <PlusCircle size={24} color={COLORS.primary} />
            <span style={styles.addEmailText}>Add Email Account</span>
          </button>
        </div>

        {/* Appearance Section */}
        <p style={styles.sectionTitle}>APPEARANCE</p>
        <div style={styles.settingsCard}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <Moon size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>Dark Mode</span>
            </div>
            <div
              style={{
                ...styles.toggleSwitch,
                backgroundColor: isDarkMode ? COLORS.primary : '#DDD',
              }}
              onClick={() => {
                const newValue = !isDarkMode;
                setIsDarkMode(newValue);
                localStorage.setItem('darkMode', JSON.stringify(newValue));
              }}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  transform: isDarkMode ? 'translateX(22px)' : 'translateX(0)',
                }}
              />
            </div>
          </div>
        </div>

        {/* About Section */}
        <p style={styles.sectionTitle}>ABOUT</p>
        <div style={styles.settingsCard}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <Info size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>Version</span>
            </div>
            <span style={styles.settingValue}>1.0.0</span>
          </div>

          <button
            style={styles.settingRow}
            onClick={() => setViewingLegalPage('support')}
          >
            <div style={styles.settingInfo}>
              <HelpCircle size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>Support</span>
            </div>
            <ChevronRight size={20} color={theme.textLight} />
          </button>

          <button
            style={styles.settingRow}
            onClick={() => setViewingLegalPage('privacy')}
          >
            <div style={styles.settingInfo}>
              <Shield size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>Privacy Policy</span>
            </div>
            <ChevronRight size={20} color={theme.textLight} />
          </button>

          <button
            style={styles.settingRow}
            onClick={() => setViewingLegalPage('terms')}
          >
            <div style={styles.settingInfo}>
              <FileTextIcon size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>Terms of Service</span>
            </div>
            <ChevronRight size={20} color={theme.textLight} />
          </button>
        </div>

        {/* Account Section */}
        <p style={styles.sectionTitle}>ACCOUNT</p>
        <div style={styles.settingsCard}>
          <button
            style={styles.settingRow}
            onClick={handleLogout}
          >
            <div style={styles.settingInfo}>
              <LogOut size={22} color={COLORS.error} />
              <span style={{ ...styles.settingLabel, color: COLORS.error }}>Sign Out</span>
            </div>
          </button>
          <button
            style={{ ...styles.settingRow, borderBottom: 'none', opacity: isDeletingAccount ? 0.6 : 1 }}
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
          >
            <div style={styles.settingInfo}>
              <Trash2 size={22} color={COLORS.error} />
              <span style={{ ...styles.settingLabel, color: COLORS.error }}>Delete Account</span>
            </div>
          </button>
        </div>
      </div>

      {/* Add Email Modal */}
      {showEmailModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Add Email Account</h2>

            <input
              style={styles.modalInput}
              placeholder="Email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              type="email"
              autoCapitalize="none"
            />

            <input
              style={styles.modalInput}
              placeholder="Alias (optional)"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
            />

            <div style={styles.modalButtons}>
              <button
                style={styles.modalCancelBtn}
                onClick={() => {
                  setShowEmailModal(false);
                  setNewEmail('');
                  setNewAlias('');
                }}
              >
                <span style={styles.modalCancelText}>Cancel</span>
              </button>

              <button
                style={styles.modalAddBtn}
                onClick={addEmailAccount}
              >
                <span style={styles.modalAddText}>Add</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render History Screen
  const renderHistory = () => {
    // Filter history based on search and category
    const filteredHistory = history.filter((item) => {
      const matchesSearch = searchQuery === '' ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.emailTo?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.settingsHeader}>
          <button style={styles.iconButton} onClick={() => { setCurrentScreen('main'); setSearchQuery(''); }}>
            <ArrowLeft size={26} color={theme.text} />
          </button>
          <span style={styles.settingsTitle}>History</span>
          <button
            style={styles.iconButton}
            onClick={() => {
              if (confirm('Are you sure you want to clear all history?')) {
                setHistory([]);
                saveHistory([]);
              }
            }}
          >
            <Trash2 size={24} color={COLORS.error} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <div style={styles.searchBar}>
            <Search size={20} color={theme.textLight} />
            <input
              type="text"
              style={styles.searchInput}
              placeholder="Search your tosses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button style={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                <X size={18} color={theme.textLight} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div style={styles.categoryFilter}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              style={{
                ...styles.categoryChip,
                backgroundColor: selectedCategory === cat.id ? cat.color : theme.card,
                borderColor: cat.color,
              }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span style={{
                ...styles.categoryChipText,
                color: selectedCategory === cat.id ? '#FFF' : theme.text,
              }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* Results count */}
        {(searchQuery || selectedCategory !== 'all') && (
          <p style={styles.resultsCount}>
            {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''} found
          </p>
        )}

        {filteredHistory.length === 0 ? (
          <div style={styles.emptyHistory}>
            {searchQuery || selectedCategory !== 'all' ? (
              <>
                <Search size={60} color={theme.textLight} />
                <p style={styles.emptyHistoryText}>No matching tosses</p>
                <p style={styles.emptyHistorySubtext}>Try a different search or category</p>
              </>
            ) : (
              <>
                <Clock size={60} color={theme.textLight} />
                <p style={styles.emptyHistoryText}>No tosses yet</p>
                <p style={styles.emptyHistorySubtext}>Your tossed thoughts will appear here</p>
              </>
            )}
          </div>
        ) : (
          <div style={styles.historyList}>
            {filteredHistory.map((item) => (
              <div key={item.id} style={styles.historyItem}>
                <div style={styles.historyItemHeader}>
                  <div style={{
                    ...styles.historyTypeIcon,
                    backgroundColor: item.category
                      ? categories.find(c => c.id === item.category)?.color || COLORS.primary
                      : COLORS.primary
                  }}>
                    {item.type === 'text' ? (
                      <FileText size={18} color="#FFF" />
                    ) : item.type === 'voice' ? (
                      <Mic size={18} color="#FFF" />
                    ) : (
                      <ImageIcon size={18} color="#FFF" />
                    )}
                  </div>
                  <div style={styles.historyItemInfo}>
                    <p style={styles.historyItemContent}>{item.content}</p>
                    <div style={styles.historyItemMetaRow}>
                      <p style={styles.historyItemMeta}>
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                      {item.category && item.category !== 'all' && (
                        <span style={{
                          ...styles.categoryBadge,
                          backgroundColor: categories.find(c => c.id === item.category)?.color || COLORS.primary,
                        }}>
                          {categories.find(c => c.id === item.category)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {item.sent && (
                  <div style={styles.sentBadge}>
                    <Check size={12} color="#FFF" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Profile Screen
  const renderProfile = () => (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.settingsHeader}>
        <button style={styles.iconButton} onClick={() => setCurrentScreen('settings')}>
          <ArrowLeft size={26} color={theme.text} />
        </button>
        <span style={styles.settingsTitle}>Profile</span>
        <div style={{ width: 42 }} />
      </div>

      <div style={styles.settingsList}>
        {/* Profile Info Section */}
        <p style={styles.sectionTitle}>PROFILE INFORMATION</p>
        <div style={styles.settingsCard}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <User size={22} color={COLORS.primary} />
              <div>
                <span style={styles.settingLabel}>Display Name</span>
                <p style={styles.settingSubtext}>{userProfile.displayName || 'Not set'}</p>
              </div>
            </div>
            <button
              style={styles.editButton}
              onClick={() => {
                setEditingProfile(true);
                setEditUsername(userProfile.username);
                setEditDisplayName(userProfile.displayName);
              }}
            >
              <Edit3 size={18} color={COLORS.primary} />
            </button>
          </div>

          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <Mail size={22} color={COLORS.primary} />
              <div>
                <span style={styles.settingLabel}>Username</span>
                <p style={styles.settingSubtext}>{userProfile.username || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <Mail size={22} color={COLORS.primary} />
              <div>
                <span style={styles.settingLabel}>Email</span>
                <p style={styles.settingSubtext}>{userProfile.email || emailAccounts[0]?.email || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div style={styles.modalOverlay} onClick={() => setEditingProfile(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit Profile</h2>

            <label style={{ ...styles.settingLabel, marginBottom: 8, display: 'block' }}>Username</label>
            <input
              style={styles.modalInput}
              placeholder="Username"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              type="text"
              autoCapitalize="none"
            />

            <label style={{ ...styles.settingLabel, marginBottom: 8, marginTop: 16, display: 'block' }}>Display Name</label>
            <input
              style={styles.modalInput}
              placeholder="Display Name"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              type="text"
            />

            <div style={styles.modalButtons}>
              <button
                style={styles.modalCancelBtn}
                onClick={() => {
                  setEditingProfile(false);
                  setEditUsername(userProfile.username);
                  setEditDisplayName(userProfile.displayName);
                }}
              >
                <span style={styles.modalCancelText}>Cancel</span>
              </button>

              <button
                style={styles.modalAddBtn}
                onClick={() => {
                  updateUserProfile();
                }}
              >
                <span style={styles.modalAddText}>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Loading state
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img src="/assets/favicon.png" alt="MindToss" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        <p style={{ color: '#FFF', marginTop: 16, fontSize: 18 }}>Loading...</p>
      </div>
    );
  }

  // If viewing legal page, show that instead
  if (viewingLegalPage) {
    return (
      <LegalPages
        page={viewingLegalPage}
        onBack={() => setViewingLegalPage(null)}
        theme={theme}
      />
    );
  }

  // Main render
  switch (currentScreen) {
    case 'auth':
      return <AuthScreen onAuthSuccess={() => setCurrentScreen('onboarding')} isDarkMode={isDarkMode} />;
    case 'onboarding':
      return renderOnboarding();
    case 'settings':
      return renderSettings();
    case 'history':
      return renderHistory();
    case 'profile':
      return renderProfile();
    default:
      return renderMainScreen();
  }
}
