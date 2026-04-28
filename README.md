# MindToss

MindToss is a quick-capture iOS app: type, record, or snap a thought and send it to your inbox for later processing.

![MindToss App](./screenshots/hero.png)

## What It Does

- Text notes with a simple character count.
- Voice memos recorded in-app and sent as email attachments.
- Photo capture or library selection with optional notes.
- Multiple destination inboxes.
- Local and synced toss history.
- Dark mode.
- In-app support, privacy, terms, sign-out, and account deletion flows.

## Tech Stack

- Vite + React + TypeScript for the app UI.
- Capacitor for the native iOS wrapper.
- Convex HTTP routes for auth, app-state sync, account deletion, and email dispatch.
- SMTP2GO for outbound email from `noreply@mindtoss.space`.
- Native Sign in with Apple through `@capacitor-community/apple-sign-in`.

## Project Structure

```text
mindtoss/
├── src/
│   ├── App.tsx                    # Main app screens and capture flow
│   ├── components/
│   │   ├── AuthScreen.tsx         # Email and Apple sign-in UI
│   │   └── LegalPages.tsx         # In-app support/privacy/terms
│   └── lib/convex.ts              # Client HTTP wrapper for Convex routes
├── convex/
│   ├── http.ts                    # Public HTTP API routes
│   ├── users.ts                   # Auth/session/state mutations and queries
│   ├── email.ts                   # SMTP2GO email action
│   └── schema.ts                  # Convex schema
├── ios/App/                       # Capacitor iOS project
├── website/                       # Public legal/support pages
├── capacitor.config.ts
├── vite.config.ts
├── package.json
└── .env.example
```

## Requirements

- Node.js 18+ with npm.
- Xcode for iOS builds.
- A Convex deployment.
- An SMTP2GO API key configured in Convex environment variables.
- Apple Developer configuration for the iOS app and Sign in with Apple.

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment
VITE_APPLE_CLIENT_ID=com.mindtoss.app
```

Set `SMTP2GO_API_KEY` in the Convex deployment environment, not in the client app.

## Development

```bash
npm install
npm run convex:dev
npm run dev
```

The Vite dev server runs the web app. Native-only capabilities such as Sign in with Apple and iOS camera behavior should be verified in the Capacitor iOS app.

## Build

```bash
npm run build
```

This runs TypeScript project checks and creates the production web bundle in `dist/`.

## Sync Web Assets To iOS

```bash
npm run sync
```

This builds the web app and copies `dist/` into both Capacitor iOS public asset directories used by the project.

Then open the iOS project:

```bash
npm run open
```

Build and archive from Xcode for App Store submission.

## Convex Deployment

```bash
npm run convex:deploy
```

Important runtime expectations:

- `/api/send-email` requires an authenticated session token.
- `/api/state` stores user app state as JSON blobs.
- Account deletion removes synced state, sessions, and the user record.
- Email delivery requires `SMTP2GO_API_KEY`.

## App Store Copy

Short description:

> Capture thoughts instantly. Toss them to your inbox. Never forget a thing.

Suggested keywords:

```text
gtd,inbox zero,capture,notes,voice memo,todo,tasks,productivity,email,quick note
```

Avoid advertising subscriptions, free-tier limits, or transcription until those features are implemented and enforced in the app/backend.

## Troubleshooting

### Email Not Sending

- Confirm the user is signed in.
- Confirm the destination inbox is a real email address.
- Avoid Apple private relay addresses for the destination inbox.
- Confirm `SMTP2GO_API_KEY` is configured in Convex.
- Check the Convex logs for `/api/send-email` errors.

### Camera Or Photos Not Working

- Verify iOS permission strings in `ios/App/MindToss/Info.plist`.
- Test native capture in the iOS app, not only the Vite web server.

### Apple Sign In Not Available

- Apple Sign In is native iOS-only in this build.
- Verify the app bundle identifier and Apple Developer capability setup.

## Support

- Email: support@mindtoss.space
- Website: https://mindtoss.space
