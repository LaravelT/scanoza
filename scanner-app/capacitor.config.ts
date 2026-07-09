import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solutionplanets.scanoza',
  appName: 'Scanoza',
  webDir: 'out',
  android: {
    allowMixedContent: true
  }
};

export default config;
