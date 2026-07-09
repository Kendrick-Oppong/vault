export const archiveApi = {
  syncChannel: (channelUrl: string, destinationFolder: string) =>
    globalThis.api.syncChannel(channelUrl, destinationFolder)
};
