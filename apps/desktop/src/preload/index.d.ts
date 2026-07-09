import { ElectronAPI } from "@electron-toolkit/preload";
import type { VaultApi } from "./index";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: VaultApi;
  }
  // Add globalThis.api
  // eslint-disable-next-line no-var
  var api: VaultApi;
}
