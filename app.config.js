// Extends app.json. The only addition is the web subpath: GitHub Pages serves the prototype at
// https://<owner>.github.io/root-vocab/, so the web build needs every link and asset under
// /root-vocab. It is set only when EXPO_BASE_URL is given (the deploy workflow does that), so
// `npx expo start` keeps serving from the root while developing.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
