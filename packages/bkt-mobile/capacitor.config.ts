import type { CapacitorConfig } from "@capacitor/cli";

const WEB_START = "https://www.bucket.foundation/research-os/home";
const web = process.env.BKT_MOBILE_WEB === "1";

const config: CapacitorConfig = {
  appId: "foundation.bucket.app",
  appName: "Bucket",
  webDir: "dist",
  server: web
    ? { url: WEB_START, allowNavigation: ["www.bucket.foundation", "bucket.foundation"], iosScheme: "capacitor", cleartext: false }
    : { androidScheme: "https", iosScheme: "capacitor", cleartext: false },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  ios: {
    webContentsDebuggingEnabled: false,
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: web ? "#e9e3d3" : undefined,
  },
  plugins: { CapacitorHttp: { enabled: !web } },
};

export default config;
