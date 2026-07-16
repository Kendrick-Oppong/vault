import type { CookieInfo } from "@/features/settings/types";

export const cookiesApi = {
  getInfo: (browserSetting: string | null): Promise<CookieInfo> =>
    globalThis.api.getCookieInfo(browserSetting),

  setBrowser: (browserSetting: string): Promise<CookieInfo> =>
    globalThis.api.setCookieBrowser(browserSetting),

  refresh: (browserSetting: string | null): Promise<CookieInfo> =>
    globalThis.api.refreshCookies(browserSetting),

  clear: (browserSetting: string | null): Promise<CookieInfo> =>
    globalThis.api.clearCookies(browserSetting)
};
