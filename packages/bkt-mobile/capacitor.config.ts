import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "foundation.bucket.app",
  appName: "Bucket",
  webDir: "dist",
  server: { androidScheme: "https", iosScheme: "capacitor", cleartext: false },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  ios: { webContentsDebuggingEnabled: false, limitsNavigationsToAppBoundDomains: true },
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
