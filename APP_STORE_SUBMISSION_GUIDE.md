# HumanAIze — App Store & Google Play Submission Guide

## Prerequisites

- [Expo account](https://expo.dev) (free)
- [Apple Developer account](https://developer.apple.com) ($99/year) — required for iOS App Store
- [Google Play Developer account](https://play.google.com/console) ($25 one-time) — required for Android
- EAS CLI installed: `npm install -g eas-cli`

---

## Step 1: Create Expo EAS Project

```bash
cd humanaize-app-design
eas login          # Log in to your Expo account
eas build:configure  # Creates EAS project and fills in projectId in app.json
```

This will update the `projectId` in `app.json` automatically.

---

## Step 2: Build for iOS (App Store)

### First-time setup
You need an Apple Developer account and App Store Connect app created.

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"New App"**
3. Platform: iOS, Name: HumanAIze, Bundle ID: `life.humanaize.app`
4. Copy the **App ID** (numeric) for `eas.json`

### Build
```bash
# Development build (iOS Simulator)
eas build --platform ios --profile development

# Production build (App Store)
eas build --platform ios --profile production
```

### Submit to App Store
```bash
eas submit --platform ios
```

---

## Step 3: Build for Android (Google Play)

### First-time setup
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app: HumanAIze
3. Create a service account and download the JSON key
4. Place the key at `./google-play-service-account.json`

### Build
```bash
# Development APK
eas build --platform android --profile development

# Production AAB (App Bundle for Play Store)
eas build --platform android --profile production
```

### Submit to Google Play
```bash
eas submit --platform android
```

---

## Step 4: App Store Listing Content

### App Name
`HumanAIze — AI Health Tracker`

### Subtitle (iOS)
`AI-Powered Nutrition & Fitness`

### Description
```
HumanAIze is your personal AI-powered health and fitness companion. 
Track nutrition with barcode scanning, log workouts, monitor your weight 
loss progress, and get personalized AI insights powered by Gemini.

KEY FEATURES:
• Smart Food Logging — Search millions of foods, scan barcodes, or use 
  AI camera scanning to detect nutrition labels automatically
• Barcode Scanner — Instant macro lookup for packaged foods
• AI Nutrition Analysis — Point your camera at any food and get 
  estimated macros powered by Gemini AI
• Workout Tracking — Log strength, cardio, HIIT, and more with 
  detailed exercise sets and reps
• Weight & Body Monitoring — Track weight trends, body measurements, 
  and estimated goal completion dates
• Personalized AI Plan — Get a custom nutrition and workout plan 
  based on your goals and health profile
• Health-Aware — Accounts for health conditions like diabetes, 
  hypertension, and more
• Daily Macro Targets — Personalized calorie and macro goals based 
  on your profile and fitness goals
```

### Keywords (iOS — 100 char max)
`nutrition,calorie,macro,fitness,workout,barcode,AI,health,diet,protein`

### Category
Primary: Health & Fitness
Secondary: Food & Drink

### Age Rating
4+ (no objectionable content)

### Privacy Policy URL
`https://humanaize.life/privacy`

### Support URL
`https://humanaize.life/support`

---

## Step 5: App Icons & Screenshots

### Required Icon Sizes
- 1024×1024 (App Store)
- 180×180 (iPhone @3x)
- 120×120 (iPhone @2x)
- 167×167 (iPad Pro)

EAS Build generates all sizes automatically from `./assets/icon.png` (must be 1024×1024, no transparency).

### Screenshots Required (iOS)
- iPhone 6.7" (1290×2796) — 3-10 screenshots
- iPhone 6.5" (1242×2688) — 3-10 screenshots
- iPad Pro 12.9" (2048×2732) — if supporting iPad

### Screenshots Required (Android)
- Phone screenshots (1080×1920 minimum) — 2-8 screenshots

---

## Step 6: Update eas.json for Submission

Edit `eas.json` and replace:
- `REPLACE_WITH_YOUR_APPLE_ID` → your Apple ID email
- `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` → numeric App ID from App Store Connect
- `REPLACE_WITH_APPLE_TEAM_ID` → your Apple Team ID (found in developer.apple.com)

---

## Step 7: Over-the-Air (OTA) Updates

After publishing, you can push JS updates without App Store review:

```bash
eas update --branch production --message "Fix macro calculation"
```

This updates the app instantly for all users without a new App Store submission.

---

## Build Status

Check build status at: https://expo.dev/accounts/[your-username]/projects/humanaize/builds

---

## Bundle Identifier

- iOS: `life.humanaize.app`
- Android: `life.humanaize.app`

These match the domain `humanaize.life` (reversed) which is the standard convention.
