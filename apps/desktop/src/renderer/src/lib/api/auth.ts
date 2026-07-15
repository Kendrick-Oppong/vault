export const authApi = {
  checkCookies: (): Promise<boolean> => globalThis.api.checkYoutubeCookies(),
  login: (): Promise<{ success: boolean; filePath: string | null; error?: string }> =>
    globalThis.api.youtubeLogin(),
  clearCookies: (): Promise<boolean> => globalThis.api.clearYoutubeCookies(),
  getCookiesPath: (): Promise<string | null> => globalThis.api.getYoutubeCookiesPath()
};
