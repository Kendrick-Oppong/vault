export const appApi = {
  getInfo: () => globalThis.api.getAppInfo(),
  checkForUpdates: () => globalThis.api.checkForUpdates(),
  installUpdate: () => globalThis.api.installUpdate(),
  quitApp: () => globalThis.api.quitApp()
};
