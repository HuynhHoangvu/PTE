import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flyedu.pte',
  appName: 'Fly PTE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
