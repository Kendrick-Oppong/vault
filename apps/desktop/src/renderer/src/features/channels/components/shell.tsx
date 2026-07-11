import { useState, useMemo } from "react";
import { Button } from "@vault/ui/components/button";
import { Input } from "@vault/ui/components/input";
import { Search, Tv, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { ChannelContextMenu } from "./channel-context-menu";
import type { Channel, ChannelStatus } from "../types";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useChannelsStore } from "@/stores/library/channels.store";
import { selectChannels, useChannelsActions } from "@/stores/library/channels.selectors";
import { useSyncChannel } from "@/lib/mutations/archive";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { getTimeAgo } from "@/lib/utils/platform";

export const ChannelView = () => {
  const channels = useChannelsStore(selectChannels);
  const { addChannel, removeChannel, updateChannel } = useChannelsActions();
  const settings = useSettingsStore(selectSettings);
  const { mutate: syncChannel } = useSyncChannel();

  const [searchQuery, setSearchQuery] = useState("");
  const [newChannelUrl, setNewChannelUrl] = useState("");

  const { openConfirmDialog } = useModalActions();

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      const search = searchQuery.toLowerCase();
      const name = (channel.name || channel.url).toLowerCase();
      return name.includes(search);
    });
  }, [channels, searchQuery]);

  const handleAddChannel = () => {
    if (!newChannelUrl.trim()) {
      toast.error("Please enter a channel URL");
      return;
    }

    const newChannel: Channel = {
      id: crypto.randomUUID(),
      url: newChannelUrl,
      destination: `${settings.downloadPath}\\${newChannelUrl.split("@")[1] || "Unknown"}`,
      status: "idle",
      lastSynced: new Date()
    };

    addChannel(newChannel);
    toast.success("Channel added successfully");
    setNewChannelUrl("");
  };

  const handleSync = (id: string) => {
    const channel = channels.find((c) => c.id === id);
    if (channel) {
      toast.info(`Syncing ${channel.name || channel.url}...`);
      syncChannel({ channelUrl: channel.url, destinationFolder: channel.destination });
      updateChannel(id, { status: "syncing" });
    }
  };

  const handleOpenFolder = (id: string) => {
    const channel = channels.find((c) => c.id === id);
    console.log(`Opening folder for ${channel?.name || channel?.url}`);
    toast.info(`Opening destination folder...`);
    // Implement folder opening logic
  };

  const handleRemove = (id: string) => {
    const channel = channels.find((c) => c.id === id);
    const channelName = channel?.name || channel?.url || "this channel";

    openConfirmDialog({
      title: "Remove channel",
      description: `Are you sure you want to remove "${channelName}"? This action cannot be undone.`,
      confirmText: "Remove",
      variant: "danger",
      onConfirm: () => {
        removeChannel(id);
        toast.warning(`Removed ${channelName}`);
      }
    });
  };

  const getStatusColor = (status: ChannelStatus) => {
    switch (status) {
      case "active":
      case "syncing":
        return "bg-green-500";
      case "queued":
        return "bg-muted-foreground";
      case "error":
        return "bg-destructive";
      case "idle":
        return "bg-secondary";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Channel Section - Simplified */}
      <div className="flex items-center gap-2 p-3 border border-border rounded-xl bg-card">
        <Input
          value={newChannelUrl}
          onChange={(e) => setNewChannelUrl(e.target.value)}
          placeholder="Channel URL (e.g., youtube.com/@channel)"
          className="flex-1 h-9 px-3 rounded-lg bg-secondary/60 border-border text-[12.5px]"
        />
        <Button
          onClick={handleAddChannel}
          className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add channel
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter channels..."
            className="w-1/2 h-9 pl-9 pr-3 rounded-lg bg-secondary/60 border-border text-[12.5px]"
          />
        </div>
        <p className="text-[11px] text-muted-foreground ml-auto">
          {channels.length} channels synced ·{" "}
          <span className="text-primary">
            {channels
              .filter((c) => c.newVideos && c.newVideos > 0)
              .reduce((acc, c) => acc + (c.newVideos || 0), 0)}{" "}
            new videos found
          </span>
        </p>
      </div>

      {/* Channel List */}
      <div className="space-y-2">
        {filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No channels found</p>
            <p className="text-xs">Add a channel above to get started</p>
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <ChannelContextMenu
              key={channel.id}
              channel={channel}
              onSync={handleSync}
              onOpenFolder={handleOpenFolder}
              onRemove={handleRemove}
            >
              <div className="flex gap-0 rounded-xl border border-border bg-card hover:bg-card-hover transition-colors overflow-hidden">
                <div className={`w-1 shrink-0 ${getStatusColor(channel.status)}`} />
                <div className="flex items-center gap-3 p-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Tv className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">
                      {channel.name || channel.url}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground truncate">
                      {channel.destination}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11.5px] text-muted-foreground">
                      Synced {getTimeAgo(channel.lastSynced)}
                    </p>
                    {channel.newVideos && channel.newVideos > 0 && (
                      <p className="text-[11px] text-primary">{channel.newVideos} new found</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSync(channel.id);
                    }}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] h-auto hover:border-primary hover:text-primary"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync now
                  </Button>
                </div>
              </div>
            </ChannelContextMenu>
          ))
        )}
      </div>
    </div>
  );
};
