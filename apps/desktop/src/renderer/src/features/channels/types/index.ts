export type ChannelStatus = "active" | "queued" | "error" | "idle" | "syncing";

export interface Channel {
  id: string;
  url: string;
  name?: string;
  destination: string;
  status: ChannelStatus;
  lastSynced: Date;
  newVideos?: number;
}
