// Manchester Gents — iOS & Android (Expo SDK 58, built with the iOS 27 SDK).
// Set EXPO_PUBLIC_API_URL / EXPO_PUBLIC_CHAT_URL in .env (see .env.example).
const fs = require('fs');

// APP_VARIANT: "development" (local dev client), "uat" (TestFlight / Play
// testing, talks to uat.manchestergents.com) or unset for the store app. Each
// installs side by side under its own bundle id; all are called MCR Gents, and
// the dev and UAT builds have a DEV / UAT badge on their icons.
const VARIANT = process.env.APP_VARIANT;
const IS_DEV = VARIANT === 'development';
const IS_UAT = VARIANT === 'uat';
const ICON_SUFFIX = IS_DEV ? '-dev' : IS_UAT ? '-uat' : '';
const BUNDLE_ID = IS_DEV ? 'com.manchestergents.app.dev' : IS_UAT ? 'com.manchestergents.app.uat' : 'com.manchestergents.app';
// Android push needs Firebase's google-services.json (download from Firebase).
const GOOGLE_SERVICES = process.env.GOOGLE_SERVICES_JSON || './google-services.json';

module.exports = ({ config }) => ({
  ...config,
  name: 'MCR Gents', // short enough not to truncate on the home screen
  slug: 'manchester-gents',
  scheme: 'mcrgents',
  version: '1.0.0',
  orientation: 'default', // iOS 27 apps are resizable; layouts adapt (incl. iPhone Duo)
  icon: `./assets/images/icon${ICON_SUFFIX}.png`,
  userInterfaceStyle: 'dark',
  backgroundColor: '#1c2837',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    appleTeamId: process.env.APPLE_TEAM_ID,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      LSApplicationQueriesSchemes: ['instagram'],
      NSPhotoLibraryUsageDescription: 'Choose photos to send in chats, share to event galleries or use as your profile picture.',
      NSCameraUsageDescription: 'Take photos to send in chats or use as your profile picture.',
      NSPhotoLibraryAddUsageDescription: 'Save event photos to your library.',
      NSCalendarsWriteOnlyAccessUsageDescription: 'Add Manchester Gents events to your calendar.'
    },
    associatedDomains: ['applinks:manchestergents.com']
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      foregroundImage: `./assets/images/adaptive-icon${ICON_SUFFIX}.png`,
      backgroundColor: '#1c2837'
    },
    edgeToEdgeEnabled: true,
    ...(fs.existsSync(GOOGLE_SERVICES) ? { googleServicesFile: GOOGLE_SERVICES } : {})
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-image',
    'expo-web-browser',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
        backgroundColor: '#1c2837'
      }
    ],
    [
      'expo-font',
      { fonts: ['./assets/fonts/Thelorin.otf'] }
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#ffd460',
        defaultChannel: 'chat'
      }
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Choose photos to send in chats or use as your profile picture.',
        cameraPermission: 'Take photos to send in chats or use as your profile picture.'
      }
    ],
    ['expo-calendar', { calendarPermission: 'Add Manchester Gents events to your calendar.' }],
    ['expo-location', { locationWhenInUsePermission: 'Share where you are with a member you’re messaging.' }],
    ['expo-media-library', { savePhotosPermission: 'Save event photos to your library.', isAccessMediaLocationEnabled: false }]
  ],
  experiments: {
    typedRoutes: false
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || (IS_UAT ? 'https://uat.manchestergents.com' : 'https://manchestergents.com'),
    chatUrl: process.env.EXPO_PUBLIC_CHAT_URL || (IS_UAT ? 'wss://chat-uat.manchestergents.com/ws' : null),
    eas: { projectId: process.env.EAS_PROJECT_ID }
  }
});
