import type { ChannelsStore } from "./channels.store";
import { useChannelsStore } from "./channels.store";
import { useShallow } from "zustand/react/shallow";

export const selectChannels = (state: ChannelsStore) => state.channels;

const selectChannelsActions = (state: ChannelsStore) => ({
  addChannel: state.addChannel,
  removeChannel: state.removeChannel,
  updateChannel: state.updateChannel
});

export const useChannelsActions = () => {
  return useChannelsStore(useShallow(selectChannelsActions));
};
