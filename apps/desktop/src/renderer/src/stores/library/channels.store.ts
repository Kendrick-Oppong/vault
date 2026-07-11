import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Channel } from "@/features/channels/types";

interface ChannelsState {
  channels: Channel[];
}

interface ChannelsActions {
  addChannel: (channel: Channel) => void;
  removeChannel: (id: string) => void;
  updateChannel: (id: string, updates: Partial<Channel>) => void;
}

export type ChannelsStore = ChannelsState & ChannelsActions;

export const useChannelsStore = create<ChannelsStore>()(
  persist(
    (set) => ({
      channels: [],
      addChannel: (channel) =>
        set((state) => ({
          channels: [channel, ...state.channels]
        })),
      removeChannel: (id) =>
        set((state) => ({
          channels: state.channels.filter((c) => c.id !== id)
        })),
      updateChannel: (id, updates) =>
        set((state) => ({
          channels: state.channels.map((c) => (c.id === id ? { ...c, ...updates } : c))
        }))
    }),
    {
      name: "vault-channels",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
