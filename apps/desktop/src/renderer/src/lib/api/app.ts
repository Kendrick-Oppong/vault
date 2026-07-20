export const appApi = {
  getInfo: () => globalThis.api.getAppInfo(),
  checkForUpdates: () => globalThis.api.checkForUpdates(),
  downloadUpdate: () => globalThis.api.downloadUpdate(),
  installUpdate: () => globalThis.api.installUpdate(),
  quitApp: () => globalThis.api.quitApp()
};
