import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safesteps.academy',
  appName: 'SafeSteps',
  webDir: 'dist',
  server: {
    url: 'https://safe-steps-academy.vercel.app',
    cleartext: false,
  },
};

export default config;