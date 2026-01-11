import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindtoss.app',
  appName: 'MindToss',
  webDir: 'dist',
  ios: {
    path: 'ios/App',
    scheme: 'MindToss'
  }
};

export default config;
