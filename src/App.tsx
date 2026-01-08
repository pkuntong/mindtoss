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
  Star,
  Info,
  HelpCircle,
  Shield,
  Check,
  X,
  Image as ImageIcon,
  FileText,
  Square,
  Brain,
} from 'lucide-react';

// Types
interface TossItem {
  id: string;
  type: 'text' | 'voice' | 'photo';
  content: string;
  timestamp: Date;
  sent: boolean;
  emailTo?: string;
}

interface EmailAccount {
  id: string;
  email: string;
  alias: string;
  isDefault: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
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

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$2.99',
    period: '/month',
    features: [
      'Unlimited tosses',
      'Voice memos',
      'Photo capture',
      'Multiple email accounts',
      'History sync',
      'Dark mode',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$24.99',
    period: '/year',
    features: [
      'All Monthly features',
      'Save 30%',
      'Priority support',
      'Early access to features',
    ],
  },
];

// Main App Component
export default function App() {
  // State
  const [currentScreen, setCurrentScreen] = useState<'onboarding' | 'main' | 'settings' | 'history' | 'subscription'>('onboarding');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'photo'>('text');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0);
  const [history, setHistory] = useState<TossItem[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [sendButtonScale, setSendButtonScale] = useState(1);

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

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadSavedData = () => {
    try {
      const savedEmails = localStorage.getItem('emailAccounts');
      const savedHistory = localStorage.getItem('tossHistory');
      const savedDarkMode = localStorage.getItem('darkMode');
      const savedSubscription = localStorage.getItem('isSubscribed');
      const hasOnboarded = localStorage.getItem('hasOnboarded');

      if (savedEmails) setEmailAccounts(JSON.parse(savedEmails));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedDarkMode) setIsDarkMode(JSON.parse(savedDarkMode));
      if (savedSubscription) setIsSubscribed(JSON.parse(savedSubscription));
      if (hasOnboarded === 'true') setCurrentScreen('main');
    } catch (error) {
      console.error('Error loading data:', error);
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

  const sendToss = async () => {
    if (emailAccounts.length === 0) {
      alert('No Email: Please add an email address in settings first.');
      return;
    }

    const targetEmail = emailAccounts[selectedEmailIndex]?.email;
    if (!targetEmail) return;

    let content = '';

    if (inputMode === 'text') {
      if (!textInput.trim()) {
        alert('Empty Note: Please enter some text to toss.');
        return;
      }
      content = textInput;
    } else if (inputMode === 'voice') {
      const voiceUri = await stopRecording();
      if (voiceUri) {
        content = '[Voice Memo]';
      } else {
        alert('No Recording: Please record a voice memo first.');
        return;
      }
    } else if (inputMode === 'photo') {
      if (!capturedImage) {
        alert('No Photo: Please take or select a photo first.');
        return;
      }
      content = '[Photo]';
    }

    setIsSending(true);
    animateSendButton();

    try {
      // Open mail client with mailto
      const subject = encodeURIComponent(`MindToss: ${new Date().toLocaleDateString()}`);
      const body = encodeURIComponent(content);
      window.open(`mailto:${targetEmail}?subject=${subject}&body=${body}`, '_blank');

      // Add to history
      const newToss: TossItem = {
        id: Date.now().toString(),
        type: inputMode,
        content: content,
        timestamp: new Date(),
        sent: true,
        emailTo: targetEmail,
      };

      const updatedHistory = [newToss, ...history].slice(0, 100);
      setHistory(updatedHistory);
      saveHistory(updatedHistory);

      // Clear inputs
      setTextInput('');
      setCapturedImage(null);
      setRecordingDuration(0);

    } catch (error) {
      console.error('Send error:', error);
      alert('Error: Failed to send toss. Please try again.');
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
      top: -10,
      right: -10,
      backgroundColor: '#FFF',
      borderRadius: 15,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
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
        icon: Brain,
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
        title: 'Add Your Email',
        subtitle: 'One-time setup',
        description: 'Enter the email address where you want to receive your tosses.',
        icon: Settings,
        showEmailInput: true,
      },
    ];

    const currentStep = steps[onboardingStep];
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
            <IconComponent size={60} color={COLORS.primary} />
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
                if (newEmail.includes('@')) {
                  const newAccount: EmailAccount = {
                    id: Date.now().toString(),
                    email: newEmail.trim(),
                    alias: newEmail.split('@')[0],
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
                  backgroundColor: isRecording ? COLORS.error : theme.card,
                  transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <button
                  style={styles.recordButton}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <Square size={50} color="#FFF" fill="#FFF" />
                  ) : (
                    <Mic size={50} color={COLORS.primary} />
                  )}
                </button>
              </div>

              <p style={styles.recordingText}>
                {isRecording ? formatDuration(recordingDuration) : 'Tap to record'}
              </p>
              <p style={styles.recordingHint}>
                {isRecording ? 'Tap stop when done' : 'Click to start recording'}
              </p>
            </div>
          )}

          {inputMode === 'photo' && (
            <div style={styles.photoContainer}>
              {capturedImage ? (
                <div style={styles.imagePreviewContainer}>
                  <img src={capturedImage} style={styles.imagePreview} alt="Captured" />
                  <button
                    style={styles.removeImageBtn}
                    onClick={() => setCapturedImage(null)}
                  >
                    <X size={30} color={COLORS.error} />
                  </button>
                </div>
              ) : (
                <div style={styles.photoButtons}>
                  <button
                    style={styles.photoBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon size={40} color={COLORS.primary} />
                    <span style={styles.photoBtnText}>Choose Photo</span>
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

        {/* Subscription Section */}
        <p style={styles.sectionTitle}>SUBSCRIPTION</p>
        <div style={styles.settingsCard}>
          <button
            style={styles.settingRow}
            onClick={() => setCurrentScreen('subscription')}
          >
            <div style={styles.settingInfo}>
              <Star size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>
                {isSubscribed ? 'Manage Subscription' : 'Subscribe to Premium'}
              </span>
            </div>
            <ChevronRight size={20} color={theme.textLight} />
          </button>
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
            onClick={() => window.open('mailto:support@mindtoss.app', '_blank')}
          >
            <div style={styles.settingInfo}>
              <HelpCircle size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>Support</span>
            </div>
            <ChevronRight size={20} color={theme.textLight} />
          </button>

          <button
            style={styles.settingRow}
            onClick={() => window.open('https://mindtoss.app/privacy', '_blank')}
          >
            <div style={styles.settingInfo}>
              <Shield size={22} color={COLORS.primary} />
              <span style={styles.settingLabel}>Privacy Policy</span>
            </div>
            <ChevronRight size={20} color={theme.textLight} />
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
  const renderHistory = () => (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.settingsHeader}>
        <button style={styles.iconButton} onClick={() => setCurrentScreen('main')}>
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

      {history.length === 0 ? (
        <div style={styles.emptyHistory}>
          <Clock size={60} color={theme.textLight} />
          <p style={styles.emptyHistoryText}>No tosses yet</p>
          <p style={styles.emptyHistorySubtext}>Your tossed thoughts will appear here</p>
        </div>
      ) : (
        <div style={styles.historyList}>
          {history.map((item) => (
            <div key={item.id} style={styles.historyItem}>
              <div style={styles.historyItemHeader}>
                <div style={styles.historyTypeIcon}>
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
                  <p style={styles.historyItemMeta}>
                    {new Date(item.timestamp).toLocaleString()} • {item.emailTo}
                  </p>
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

  // Render Subscription Screen
  const renderSubscription = () => (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.settingsHeader}>
        <button style={styles.iconButton} onClick={() => setCurrentScreen('settings')}>
          <ArrowLeft size={26} color={theme.text} />
        </button>
        <span style={styles.settingsTitle}>Premium</span>
        <div style={{ width: 42 }} />
      </div>

      <div style={styles.subscriptionContent}>
        {/* Hero */}
        <div style={styles.subscriptionHero}>
          <div style={styles.subscriptionHeroBg}>
            <Star size={50} color="#FFF" />
            <h2 style={styles.subscriptionHeroTitle}>MindToss Premium</h2>
            <p style={styles.subscriptionHeroSubtitle}>
              Unlock unlimited tosses and premium features
            </p>
          </div>
        </div>

        {/* Plans */}
        <div style={styles.plansContainer}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              style={styles.planCard}
              onClick={() => {
                if (confirm(`Subscribe to ${plan.name} for ${plan.price}${plan.period}?`)) {
                  setIsSubscribed(true);
                  localStorage.setItem('isSubscribed', 'true');
                  alert('Welcome to Premium!');
                  setCurrentScreen('main');
                }
              }}
            >
              {plan.id === 'yearly' && (
                <div style={styles.saveBadge}>
                  <span style={styles.saveBadgeText}>BEST VALUE</span>
                </div>
              )}

              <p style={styles.planName}>{plan.name}</p>
              <div style={styles.planPriceRow}>
                <span style={styles.planPrice}>{plan.price}</span>
                <span style={styles.planPeriod}>{plan.period}</span>
              </div>

              <div style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <div key={index} style={styles.planFeatureRow}>
                    <Check size={18} color={COLORS.success} />
                    <span style={styles.planFeatureText}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Restore */}
        <button style={styles.restoreBtn}>
          <span style={styles.restoreText}>Restore Purchases</span>
        </button>

        {/* Terms */}
        <p style={styles.termsText}>
          Subscriptions will automatically renew unless cancelled at least 24 hours before the end of the current period.
          Payment will be charged to your account.
        </p>
      </div>
    </div>
  );

  // Main render
  switch (currentScreen) {
    case 'onboarding':
      return renderOnboarding();
    case 'settings':
      return renderSettings();
    case 'history':
      return renderHistory();
    case 'subscription':
      return renderSubscription();
    default:
      return renderMainScreen();
  }
}
