# Mobile app (Expo)

A React Native app that uses the same API as the website and opens Stripe Checkout in an in-app browser.

```bash
cd mobile
npm install
npx expo install --fix      # aligns native package versions with your Expo SDK
cp .env.example .env        # set EXPO_PUBLIC_API_URL
npx expo start              # scan the QR code with Expo Go on your phone
```

Before publishing, change `bundleIdentifier` / `package` in `app.json` to your own reverse domain (e.g. `com.yourbakery.pistachioloaf`).

## Publishing to the App Store

1. Join the Apple Developer Program ($99/year).
2. `npm install -g eas-cli && eas login && eas build:configure`
3. `eas build --platform ios` (builds in the cloud, no Mac required)
4. `eas submit --platform ios`, then complete the listing in App Store Connect.

Apple may reject apps that only repeat a website. Before submitting, consider adding features that make sense in an app: order history, saved delivery address, and a notification when new bake dates open.
