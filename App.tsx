import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Modal,
  Alert,
  Platform,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  FlatList,
  Switch,
  Linking,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import { Camera } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

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
  primary: '#FF6B35',      // Vibrant orange (Braintoss signature)
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0);
  const [history, setHistory] = useState<TossItem[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  // Animations
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const modeIndicator = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
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
    requestPermissions();
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const loadSavedData = async () => {
    try {
      const savedEmails = await AsyncStorage.getItem('emailAccounts');
      const savedHistory = await AsyncStorage.getItem('tossHistory');
      const savedDarkMode = await AsyncStorage.getItem('darkMode');
      const savedSubscription = await AsyncStorage.getItem('isSubscribed');
      const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');

      if (savedEmails) setEmailAccounts(JSON.parse(savedEmails));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedDarkMode) setIsDarkMode(JSON.parse(savedDarkMode));
      if (savedSubscription) setIsSubscribed(JSON.parse(savedSubscription));
      if (hasOnboarded === 'true') setCurrentScreen('main');
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveEmailAccounts = async (accounts: EmailAccount[]) => {
    try {
      await AsyncStorage.setItem('emailAccounts', JSON.stringify(accounts));
    } catch (error) {
      console.error('Error saving emails:', error);
    }
  };

  const saveHistory = async (items: TossItem[]) => {
    try {
      await AsyncStorage.setItem('tossHistory', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: audioStatus } = await Audio.requestPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    setHasPermissions(
      cameraStatus === 'granted' && 
      audioStatus === 'granted' && 
      mediaStatus === 'granted'
    );
  };

  const animateSendButton = () => {
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const switchMode = (mode: 'text' | 'voice' | 'photo') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputMode(mode);
    const toValue = mode === 'text' ? 0 : mode === 'voice' ? 1 : 2;
    Animated.spring(modeIndicator, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (uri) {
      return uri;
    }
    return null;
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const sendToss = async () => {
    if (emailAccounts.length === 0) {
      Alert.alert('No Email', 'Please add an email address in settings first.');
      return;
    }

    const targetEmail = emailAccounts[selectedEmailIndex]?.email;
    if (!targetEmail) return;

    let content = '';
    let attachments: string[] = [];

    if (inputMode === 'text') {
      if (!textInput.trim()) {
        Alert.alert('Empty Note', 'Please enter some text to toss.');
        return;
      }
      content = textInput;
    } else if (inputMode === 'voice') {
      const voiceUri = await stopRecording();
      if (voiceUri) {
        content = '[Voice Memo]';
        attachments = [voiceUri];
      } else {
        Alert.alert('No Recording', 'Please record a voice memo first.');
        return;
      }
    } else if (inputMode === 'photo') {
      if (!capturedImage) {
        Alert.alert('No Photo', 'Please take or select a photo first.');
        return;
      }
      content = '[Photo]';
      attachments = [capturedImage];
    }

    setIsSending(true);
    animateSendButton();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [targetEmail],
          subject: `🧠 Braintoss: ${new Date().toLocaleDateString()}`,
          body: content,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      } else {
        // Fallback for when mail composer is not available
        Alert.alert(
          'Mail Not Available',
          'Please configure the Mail app to send tosses.',
          [{ text: 'OK' }]
        );
      }

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
      Alert.alert('Error', 'Failed to send toss. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const addEmailAccount = () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeEmailAccount = (id: string) => {
    Alert.alert(
      'Remove Email',
      'Are you sure you want to remove this email?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = emailAccounts.filter(e => e.id !== id);
            setEmailAccounts(updated);
            saveEmailAccounts(updated);
            if (selectedEmailIndex >= updated.length) {
              setSelectedEmailIndex(Math.max(0, updated.length - 1));
            }
          },
        },
      ]
    );
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    setCurrentScreen('main');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Onboarding Screen
  const renderOnboarding = () => {
    const steps = [
      {
        title: 'Welcome to MindToss',
        subtitle: "Don't forget a thing!",
        description: 'Capture your thoughts instantly and send them straight to your inbox.',
        icon: 'brain',
      },
      {
        title: 'Speak, Snap, or Type',
        subtitle: 'Multiple capture modes',
        description: 'Use voice memos, take photos, or type quick notes - whatever works for you.',
        icon: 'mic',
      },
      {
        title: 'Straight to Your Inbox',
        subtitle: 'No categorizing needed',
        description: 'Your thoughts go directly to your email for processing later with GTD or Inbox Zero.',
        icon: 'mail',
      },
      {
        title: 'Add Your Email',
        subtitle: 'One-time setup',
        description: 'Enter the email address where you want to receive your tosses.',
        icon: 'settings',
        showEmailInput: true,
      },
    ];

    const currentStep = steps[onboardingStep];

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primary }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.onboardingContainer}>
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  { backgroundColor: index <= onboardingStep ? '#FFF' : 'rgba(255,255,255,0.3)' },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <View style={styles.onboardingContent}>
            <View style={styles.iconCircle}>
              <Ionicons 
                name={currentStep.icon as any} 
                size={60} 
                color={COLORS.primary} 
              />
            </View>
            
            <Text style={styles.onboardingTitle}>{currentStep.title}</Text>
            <Text style={styles.onboardingSubtitle}>{currentStep.subtitle}</Text>
            <Text style={styles.onboardingDescription}>{currentStep.description}</Text>

            {currentStep.showEmailInput && (
              <View style={styles.onboardingEmailInput}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
          </View>

          {/* Navigation */}
          <View style={styles.onboardingNav}>
            {onboardingStep > 0 && (
              <TouchableOpacity
                style={styles.onboardingBackBtn}
                onPress={() => setOnboardingStep(prev => prev - 1)}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.onboardingNextBtn}
              onPress={() => {
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
                    Alert.alert('Email Required', 'Please enter a valid email address.');
                  }
                } else {
                  setOnboardingStep(prev => prev + 1);
                }
              }}
            >
              <Text style={styles.onboardingNextText}>
                {onboardingStep === steps.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {onboardingStep < steps.length - 1 && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => setOnboardingStep(steps.length - 1)}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  };

  // Render Main Screen
  const renderMainScreen = () => {
    const modeTranslate = modeIndicator.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0, width / 3, (width / 3) * 2],
    });

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('settings')}>
            <Ionicons name="settings-outline" size={26} color={theme.text} />
          </TouchableOpacity>
          
          <Image
            source={require('./assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <TouchableOpacity onPress={() => setCurrentScreen('history')}>
            <Ionicons name="time-outline" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Email Selector */}
        {emailAccounts.length > 0 && (
          <TouchableOpacity
            style={[styles.emailSelector, { backgroundColor: theme.card }]}
            onPress={() => {
              const nextIndex = (selectedEmailIndex + 1) % emailAccounts.length;
              setSelectedEmailIndex(nextIndex);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.emailSelectorText, { color: theme.text }]} numberOfLines={1}>
              {emailAccounts[selectedEmailIndex]?.alias || emailAccounts[selectedEmailIndex]?.email}
            </Text>
            {emailAccounts.length > 1 && (
              <Ionicons name="chevron-down" size={16} color={theme.textLight} />
            )}
          </TouchableOpacity>
        )}

        {/* Mode Tabs */}
        <View style={[styles.modeTabs, { backgroundColor: theme.card }]}>
          <Animated.View
            style={[
              styles.modeIndicator,
              { transform: [{ translateX: modeTranslate }] },
            ]}
          />
          
          <TouchableOpacity
            style={styles.modeTab}
            onPress={() => switchMode('text')}
          >
            <Feather 
              name="edit-3" 
              size={22} 
              color={inputMode === 'text' ? '#FFF' : theme.textLight} 
            />
            <Text style={[
              styles.modeTabText,
              { color: inputMode === 'text' ? '#FFF' : theme.textLight }
            ]}>
              Note
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.modeTab}
            onPress={() => switchMode('voice')}
          >
            <Ionicons 
              name="mic-outline" 
              size={22} 
              color={inputMode === 'voice' ? '#FFF' : theme.textLight} 
            />
            <Text style={[
              styles.modeTabText,
              { color: inputMode === 'voice' ? '#FFF' : theme.textLight }
            ]}>
              Voice
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.modeTab}
            onPress={() => switchMode('photo')}
          >
            <Ionicons 
              name="camera-outline" 
              size={22} 
              color={inputMode === 'photo' ? '#FFF' : theme.textLight} 
            />
            <Text style={[
              styles.modeTabText,
              { color: inputMode === 'photo' ? '#FFF' : theme.textLight }
            ]}>
              Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Area */}
        <View style={styles.inputArea}>
          {inputMode === 'text' && (
            <View style={[styles.textInputContainer, { backgroundColor: theme.card }]}>
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.textLight}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <Text style={[styles.charCount, { color: theme.textLight }]}>
                {textInput.length} characters
              </Text>
            </View>
          )}

          {inputMode === 'voice' && (
            <View style={styles.voiceContainer}>
              <Animated.View
                style={[
                  styles.recordingCircle,
                  {
                    backgroundColor: isRecording ? COLORS.error : theme.card,
                    transform: [{ scale: isRecording ? pulseAnim : 1 }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={isRecording ? stopRecording : startRecording}
                  onLongPress={startRecording}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={50}
                    color={isRecording ? '#FFF' : COLORS.primary}
                  />
                </TouchableOpacity>
              </Animated.View>
              
              <Text style={[styles.recordingText, { color: theme.text }]}>
                {isRecording ? formatDuration(recordingDuration) : 'Tap to record'}
              </Text>
              <Text style={[styles.recordingHint, { color: theme.textLight }]}>
                {isRecording ? 'Tap stop when done' : 'Hold for quick recording'}
              </Text>
            </View>
          )}

          {inputMode === 'photo' && (
            <View style={styles.photoContainer}>
              {capturedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: capturedImage }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setCapturedImage(null)}
                  >
                    <Ionicons name="close-circle" size={30} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={[styles.photoBtn, { backgroundColor: theme.card }]}
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera" size={40} color={COLORS.primary} />
                    <Text style={[styles.photoBtnText, { color: theme.text }]}>Camera</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.photoBtn, { backgroundColor: theme.card }]}
                    onPress={pickImage}
                  >
                    <Ionicons name="images" size={40} color={COLORS.primary} />
                    <Text style={[styles.photoBtnText, { color: theme.text }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Send Button */}
        <View style={styles.sendContainer}>
          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                { opacity: isSending ? 0.7 : 1 }
              ]}
              onPress={sendToss}
              disabled={isSending}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.sendGradient}
              >
                {isSending ? (
                  <ActivityIndicator color="#FFF" size="large" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={28} color="#FFF" />
                    <Text style={styles.sendButtonText}>TOSS</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Recent History Preview */}
        {history.length > 0 && (
          <View style={styles.recentHistory}>
            <Text style={[styles.recentTitle, { color: theme.textLight }]}>
              Recent
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {history.slice(0, 5).map((item) => (
                <View key={item.id} style={[styles.recentItem, { backgroundColor: theme.card }]}>
                  <Ionicons
                    name={
                      item.type === 'text' ? 'document-text-outline' :
                      item.type === 'voice' ? 'mic-outline' : 'image-outline'
                    }
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={[styles.recentItemText, { color: theme.text }]} numberOfLines={1}>
                    {item.content}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    );
  };

  // Render Settings Screen
  const renderSettings = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('main')}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.settingsTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.settingsList}>
        {/* Email Accounts Section */}
        <Text style={[styles.sectionTitle, { color: theme.textLight }]}>EMAIL ACCOUNTS</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
          {emailAccounts.map((account, index) => (
            <View key={account.id} style={styles.emailRow}>
              <TouchableOpacity
                style={styles.emailInfo}
                onPress={() => setSelectedEmailIndex(index)}
              >
                <View style={[
                  styles.emailRadio,
                  selectedEmailIndex === index && styles.emailRadioSelected
                ]} />
                <View>
                  <Text style={[styles.emailAlias, { color: theme.text }]}>
                    {account.alias}
                  </Text>
                  <Text style={[styles.emailAddress, { color: theme.textLight }]}>
                    {account.email}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeEmailAccount(account.id)}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity
            style={styles.addEmailBtn}
            onPress={() => setShowEmailModal(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addEmailText}>Add Email Account</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.textLight }]}>APPEARANCE</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={async (value) => {
                setIsDarkMode(value);
                await AsyncStorage.setItem('darkMode', JSON.stringify(value));
              }}
              trackColor={{ false: '#DDD', true: COLORS.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Subscription Section */}
        <Text style={[styles.sectionTitle, { color: theme.textLight }]}>SUBSCRIPTION</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setCurrentScreen('subscription')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="star-outline" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                {isSubscribed ? 'Manage Subscription' : 'Subscribe to Premium'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textLight} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: theme.textLight }]}>ABOUT</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Version</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textLight }]}>1.0.0</Text>
          </View>
          
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('mailto:support@mindtoss.app')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://mindtoss.app/privacy')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="shield-outline" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Email Modal */}
      <Modal visible={showEmailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Email Account</Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.card, color: theme.text }]}
              placeholder="Email address"
              placeholderTextColor={theme.textLight}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.card, color: theme.text }]}
              placeholder="Alias (optional)"
              placeholderTextColor={theme.textLight}
              value={newAlias}
              onChangeText={setNewAlias}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowEmailModal(false);
                  setNewEmail('');
                  setNewAlias('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={addEmailAccount}
              >
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  // Render History Screen
  const renderHistory = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('main')}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.settingsTitle, { color: theme.text }]}>History</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Clear History',
              'Are you sure you want to clear all history?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => {
                    setHistory([]);
                    saveHistory([]);
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Ionicons name="time-outline" size={60} color={theme.textLight} />
          <Text style={[styles.emptyHistoryText, { color: theme.textLight }]}>
            No tosses yet
          </Text>
          <Text style={[styles.emptyHistorySubtext, { color: theme.textLight }]}>
            Your tossed thoughts will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyList}
          renderItem={({ item }) => (
            <View style={[styles.historyItem, { backgroundColor: theme.card }]}>
              <View style={styles.historyItemHeader}>
                <View style={styles.historyTypeIcon}>
                  <Ionicons
                    name={
                      item.type === 'text' ? 'document-text' :
                      item.type === 'voice' ? 'mic' : 'image'
                    }
                    size={18}
                    color="#FFF"
                  />
                </View>
                <View style={styles.historyItemInfo}>
                  <Text style={[styles.historyItemContent, { color: theme.text }]} numberOfLines={2}>
                    {item.content}
                  </Text>
                  <Text style={[styles.historyItemMeta, { color: theme.textLight }]}>
                    {new Date(item.timestamp).toLocaleString()} • {item.emailTo}
                  </Text>
                </View>
              </View>
              {item.sent && (
                <View style={styles.sentBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );

  // Render Subscription Screen
  const renderSubscription = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('settings')}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.settingsTitle, { color: theme.text }]}>Premium</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.subscriptionContent}>
        {/* Hero */}
        <View style={styles.subscriptionHero}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.subscriptionHeroBg}
          >
            <Ionicons name="star" size={50} color="#FFF" />
            <Text style={styles.subscriptionHeroTitle}>MindToss Premium</Text>
            <Text style={styles.subscriptionHeroSubtitle}>
              Unlock unlimited tosses and premium features
            </Text>
          </LinearGradient>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => {
                Alert.alert(
                  'Subscribe',
                  `Subscribe to ${plan.name} for ${plan.price}${plan.period}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Subscribe',
                      onPress: async () => {
                        // In a real app, this would trigger Apple/Google IAP
                        setIsSubscribed(true);
                        await AsyncStorage.setItem('isSubscribed', 'true');
                        Alert.alert('Success', 'Welcome to Premium!');
                        setCurrentScreen('main');
                      },
                    },
                  ]
                );
              }}
            >
              {plan.id === 'yearly' && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>BEST VALUE</Text>
                </View>
              )}
              
              <Text style={[styles.planName, { color: theme.text }]}>{plan.name}</Text>
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: COLORS.primary }]}>{plan.price}</Text>
                <Text style={[styles.planPeriod, { color: theme.textLight }]}>{plan.period}</Text>
              </View>
              
              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.planFeatureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={[styles.planFeatureText, { color: theme.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: COLORS.primary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.termsText, { color: theme.textLight }]}>
          Subscriptions will automatically renew unless cancelled at least 24 hours before the end of the current period. 
          Payment will be charged to your Apple ID account.
        </Text>
      </ScrollView>
    </SafeAreaView>
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Onboarding
  onboardingContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  progressDots: {
    flexDirection: 'row',
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
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  onboardingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  onboardingSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  onboardingDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  onboardingEmailInput: {
    width: '100%',
    marginTop: 32,
  },
  emailInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
  },
  onboardingNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  onboardingBackBtn: {
    padding: 12,
  },
  onboardingNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    marginLeft: 'auto',
  },
  onboardingNextText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  skipBtn: {
    alignSelf: 'center',
    padding: 12,
    marginTop: 12,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logo: {
    width: 120,
    height: 36,
  },
  
  // Email Selector
  emailSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  emailSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 200,
  },
  
  // Mode Tabs
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    position: 'relative',
  },
  modeIndicator: {
    position: 'absolute',
    width: (width - 48) / 3,
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    left: 4,
    top: 4,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
    zIndex: 1,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Input Area
  inputArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  
  // Voice Recording
  voiceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
  },
  recordingHint: {
    fontSize: 14,
    marginTop: 8,
  },
  
  // Photo
  photoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  photoBtn: {
    width: 130,
    height: 130,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: width - 80,
    height: width - 80,
    borderRadius: 20,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFF',
    borderRadius: 15,
  },
  
  // Send Button
  sendContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sendButton: {
    width: 180,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  sendGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sendButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 2,
  },
  
  // Recent History
  recentHistory: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    gap: 8,
    maxWidth: 200,
  },
  recentItemText: {
    fontSize: 13,
    flex: 1,
  },
  
  // Settings
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 1,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 14,
  },
  emailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emailRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emailRadioSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  emailAlias: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailAddress: {
    fontSize: 13,
    marginTop: 2,
  },
  addEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addEmailText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  modalAddBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  
  // History
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  historyList: {
    padding: 20,
  },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemContent: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  historyItemMeta: {
    fontSize: 12,
  },
  sentBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Subscription
  subscriptionContent: {
    flex: 1,
  },
  subscriptionHero: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 20,
  },
  subscriptionHeroBg: {
    padding: 32,
    alignItems: 'center',
  },
  subscriptionHeroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 16,
  },
  subscriptionHeroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  plansContainer: {
    padding: 20,
    gap: 16,
  },
  planCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    position: 'relative',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  planFeatures: {
    marginTop: 20,
    gap: 12,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planFeatureText: {
    fontSize: 15,
  },
  restoreBtn: {
    alignItems: 'center',
    padding: 16,
  },
  restoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    lineHeight: 18,
  },
});
