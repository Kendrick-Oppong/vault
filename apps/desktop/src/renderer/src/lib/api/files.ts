export const filesApi = {
  openInFolder: (filePath: string): Promise<void> => globalThis.api.openInFolder(filePath),
  openFile: (filePath: string): Promise<string | null> => globalThis.api.openFile(filePath)
};
