// Manchester Gents — iOS & Android (Expo SDK 58, built with the iOS 27 SDK).
// Set EXPO_PUBLIC_API_URL / EXPO_PUBLIC_CHAT_URL in .env (see .env.example).
const fs = require('fs');

const IS_DEV = process.env.APP_VARIANT === 'development';
// Android push needs Firebase's google-services.json (download from Firebase).
const GOOGLE_SERVICES = process.env.GOOGLE_SERVICES_JSON || './google-services.json';

module.exports = ({ config }) => ({
  ...config,
  name: IS_DEV ? 'MCR Dev' : 'MCR Gents', // short enough not to truncate on the home screen
  slug: 'manchester-gents',
  scheme: 'mcrgents',
  version: '1.0.0',
  orientation: 'default', // iOS 27 apps are resizable; layouts adapt (incl. iPhone Duo)
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#1c2837',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: IS_DEV ? 'com.manchestergents.app.dev' : 'com.manchestergents.app',
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
    package: IS_DEV ? 'com.manchestergents.app.dev' : 'com.manchestergents.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
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
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://manchestergents.com',
    chatUrl: process.env.EXPO_PUBLIC_CHAT_URL || null,
    eas: { projectId: process.env.EAS_PROJECT_ID }
  }
});
