import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindtoss.app',
  appName: 'MindToss App',
  webDir: 'dist',
  ios: {
    path: 'ios/App',
    scheme: 'mindtoss',
    // App Groups for sharing data between app and extensions
    // (configured in Xcode under Signing & Capabilities)
  },
  plugins: {
    App: {
      // Enable deep linking
    }
  }
};

export default config;
