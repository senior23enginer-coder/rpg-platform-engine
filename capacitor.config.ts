import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mac2394q02.rpgplatform",
  appName: "RPG Platform Engine",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    backgroundColor: "#050905",
    allowMixedContent: true,
    captureInput: true,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
