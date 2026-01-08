# MindToss - Quick Capture iOS App

A Braintoss clone - capture thoughts instantly and send them straight to your inbox. Built with React Native & Expo for iOS.

![MindToss App](./screenshots/hero.png)

## Features

### Core Functionality
- **📝 Text Notes** - Quick text capture with character count
- **🎤 Voice Memos** - Record voice notes with one tap
- **📷 Photo Capture** - Take photos or pick from gallery
- **📧 Email Integration** - Sends directly to your inbox via iOS Mail
- **📜 History** - View and manage your toss history
- **🌓 Dark Mode** - Full dark theme support

### GTD & Inbox Zero Ready
- Designed for Getting Things Done methodology
- Zero categorization - just capture and toss
- Process later from your inbox

### Premium Features (Subscription)
- Unlimited tosses
- Multiple email accounts
- Voice memo transcription
- Priority support

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Language**: TypeScript
- **State**: React Hooks + AsyncStorage
- **Audio**: expo-av
- **Camera**: expo-camera + expo-image-picker
- **Email**: expo-mail-composer
- **Animations**: React Native Animated API
- **Haptics**: expo-haptics
- **Build**: EAS Build

## Project Structure

```
mindtoss/
├── App.tsx              # Main app component with all screens
├── app.json             # Expo configuration
├── package.json         # Dependencies
├── eas.json             # EAS Build configuration
├── tsconfig.json        # TypeScript config
├── babel.config.js      # Babel config
└── assets/
    ├── icon.png         # App icon (1024x1024)
    ├── adaptive-icon.png
    ├── splash.png       # Splash screen
    ├── favicon.png
    └── logo.png         # In-app logo
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Apple Developer Account (for iOS builds)
- Xcode 15+ (for iOS simulator)

### Installation

1. **Clone and Install**
```bash
cd mindtoss
npm install
```

2. **Create Asset Files**

You need to create these image assets in the `assets/` folder:
- `icon.png` - 1024x1024 app icon
- `splash.png` - 1284x2778 splash screen
- `adaptive-icon.png` - 1024x1024 foreground icon
- `logo.png` - In-app logo (300x100)
- `favicon.png` - 48x48 web favicon

3. **Start Development**
```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios
```

### Running on Device

```bash
# Install Expo Go on your iPhone
# Scan the QR code from terminal
```

## Building for App Store

### 1. Configure EAS

```bash
# Login to Expo
eas login

# Configure your project
eas build:configure
```

### 2. Update Configuration

Edit `eas.json` with your Apple credentials:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

Edit `app.json`:
- Set `expo.ios.bundleIdentifier` to your unique identifier
- Update `expo.extra.eas.projectId` with your project ID
- Set `expo.owner` to your Expo username

### 3. Build for iOS

```bash
# Development build (for testing)
eas build --platform ios --profile development

# Preview build (internal testing)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

### 4. Submit to App Store

```bash
eas submit --platform ios
```

## Setting Up In-App Purchases

### 1. App Store Connect Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create your app
3. Go to **Features > In-App Purchases**
4. Add subscriptions:
   - `mindtoss_monthly` - $2.99/month
   - `mindtoss_yearly` - $24.99/year

### 2. Add Revenue Cat (Recommended)

```bash
npm install react-native-purchases
```

Add to `App.tsx`:
```typescript
import Purchases from 'react-native-purchases';

// In useEffect
Purchases.configure({ apiKey: 'your-revenuecat-api-key' });
```

### 3. Alternative: expo-in-app-purchases

```bash
npx expo install expo-in-app-purchases
```

## Customization

### Colors
Edit the `COLORS` object in `App.tsx`:
```typescript
const COLORS = {
  primary: '#FF6B35',      // Main brand color
  primaryDark: '#E55A2B',  // Darker variant
  // ... etc
};
```

### App Name
1. Change `name` in `app.json`
2. Update `bundleIdentifier` 
3. Update package name in `package.json`

### Subscription Prices
Edit `SUBSCRIPTION_PLANS` in `App.tsx`

## App Store Requirements

### Privacy Policy
Create a privacy policy page. Required data disclosures:
- Email address (for toss delivery)
- Photos (optional capture)
- Audio (voice memos)

### App Screenshots (Required Sizes)
- iPhone 6.7": 1290 x 2796
- iPhone 6.5": 1284 x 2778
- iPhone 5.5": 1242 x 2208
- iPad Pro 12.9": 2048 x 2732

### App Store Description

**Short Description:**
> Capture thoughts instantly. Toss them to your inbox. Never forget a thing.

**Full Description:**
```
Don't forget a thing with MindToss!

Whenever you have a thought that you don't want to lose - speak, snap or type it into MindToss and it will be sent to your inbox for later processing.

• Capture your To-do's in one click
• Empty your brain on the spot
• Quickly capture when on the move
• Voice memos easily captured
• Capture inspiring ideas, receipts or business cards

Perfect for GTD (Getting Things Done) and Inbox Zero methodologies.

FEATURES:
✓ Text notes - Type quick thoughts
✓ Voice memos - Speak your mind
✓ Photo capture - Snap images instantly
✓ Multiple email accounts - Send to work or personal
✓ History - Never lose a toss
✓ Dark mode - Easy on the eyes

FREE FEATURES:
• 10 tosses per day
• Text and photo capture
• Single email account

PREMIUM SUBSCRIPTION:
• Unlimited tosses
• Voice memos
• Multiple email accounts
• Priority support

Subscription pricing:
• Monthly: $2.99/month
• Yearly: $24.99/year (save 30%!)

Subscriptions automatically renew unless cancelled 24 hours before the end of the current period.
```

### Keywords (100 chars max)
```
gtd,inbox zero,capture,notes,voice memo,todo,tasks,productivity,email,quick note
```

## Troubleshooting

### Build Issues

**Error: Missing provisioning profile**
```bash
eas credentials
# Select iOS > Build Credentials > Generate new
```

**Error: Bundle identifier mismatch**
- Ensure `ios.bundleIdentifier` in `app.json` matches App Store Connect

### Runtime Issues

**Camera not working**
- Check `NSCameraUsageDescription` in `app.json`
- Verify permissions in Settings app

**Email not sending**
- Mail app must be configured on device
- Check recipient email is valid

## License

MIT License - See LICENSE file

## Support

- Email: support@mindtoss.app
- Website: https://mindtoss.app

---

Built with ❤️ using React Native & Expo
