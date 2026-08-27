import { SoroScanClient } from "@soroscan/sdk";

export const soroscan = new SoroScanClient({
  baseUrl: process.env.NEXT_PUBLIC_SOROSCAN_API_URL || "[https://api.soroscan.io](https://api.soroscan.io)",
  apiKey: process.env.NEXT_PUBLIC_SOROSCAN_API_KEY,
});