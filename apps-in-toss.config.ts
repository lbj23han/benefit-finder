import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'benefit-finder',

  brand: {
    primaryColor: '#1B6B4A'
  },

  permissions: [],
  navigationBar: {
    withBackButton: false,
  },
  webBundleDir: 'dist/web'
});
