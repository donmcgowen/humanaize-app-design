# HumanAIze — React Native Mobile App

> iOS and Android native app for HumanAIze, built with Expo and React Native.
> Connects to the existing `humanaize.life` backend — no backend changes required.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo (React Native) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| API Client | tRPC + React Query |
| Styling | React Native StyleSheet + NativeWind (planned) |
| Auth | Session cookies via AsyncStorage |
| Backend | `https://humanaize.life` (shared with web app) |

---

## Project Structure

```
app/
  _layout.tsx          ← Root layout (tRPC + QueryClient providers)
  index.tsx            ← Auth guard / redirect
  auth/
    _layout.tsx
    login.tsx          ← Login screen
    signup.tsx         ← Signup screen
  tabs/
    _layout.tsx        ← Bottom tab navigator
    dashboard.tsx      ← Home / daily summary
    food.tsx           ← Food logging
    workouts.tsx       ← Workout tracking
    monitoring.tsx     ← Weight, measurements, health trends
    profile.tsx        ← User profile & settings
lib/
  trpc.ts              ← tRPC client (points to humanaize.life)
  auth.ts              ← Login, signup, logout, session storage
constants/
  colors.ts            ← HumanAIze dark theme color palette
components/            ← Shared UI components (to be built)
hooks/                 ← Custom React hooks (to be built)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode + iOS Simulator (Mac only)
- Android: Android Studio + emulator, or physical device with Expo Go

### Install & Run

```bash
npm install
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with **Expo Go** app on your physical device

---

## Backend Connection

The app connects to `https://humanaize.life/trpc` — the same backend as the web app.
All tRPC procedures, auth, food logging, and AI features are shared.

To point to a local dev server instead:
```typescript
// lib/trpc.ts
const API_URL = "http://YOUR_LOCAL_IP:3000";
```

---

## Roadmap

- [ ] Complete food logging with barcode scanner (expo-camera)
- [ ] Workout logging with exercise library
- [ ] Weight & measurement tracking with charts
- [ ] Apple HealthKit integration (expo-health)
- [ ] Google Fit integration
- [ ] Push notifications (expo-notifications)
- [ ] Google & Facebook OAuth login
- [ ] App Store + Google Play submission
- [ ] PWA support for web

---

## Related

- **Web App:** [github.com/donmcgowen/HumanAIze-app](https://github.com/donmcgowen/HumanAIze-app)
- **Live Web App:** [humanaize.life](https://humanaize.life)
