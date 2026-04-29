import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'benefit-finder',
  brand: {
    displayName: '혜택줍줍',
    primaryColor: '#1B6B4A',
    icon: 'https://findmymoney.vercel.app/icon-512.png',
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'next dev',
      build: 'npm run build:toss',
    },
  },
  permissions: [],
  outdir: 'dist/web',
});
