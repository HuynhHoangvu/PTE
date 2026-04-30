import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flyedu.pte',
  appName: 'Fly Academic',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Soft input (keyboard) should resize the WebView, not push content up.
    adjustModeToResizeOnKeyboard: true,
    // Capture hardware back button to let React Router handle it.
    handleApplicationNotifications: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#fffdf8',
      showSpinner: false,
    },
  },
};

export default config;
