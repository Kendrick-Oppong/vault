import { useState } from "react";
import { FilterTabs } from "./filter-tabs";
import { BulkActions } from "./bulk-actions";
import { QueueList } from "./queue-list";
import type { QueueFilter, QueueItem, QueueStats } from "../types";
import { toast } from "sonner";

// Mock data - replace with real data later
const mockItems: QueueItem[] = [
  {
    id: "jhqw202b",
    title: "Building a Rust CLI from Scratch",
    channel: "Fireship",
    status: "paused",
    progress: 93.9,
    size: "340 MB",
    downloaded: "319 MB",
    addedAt: new Date(),
    type: "video",
    format: "1080p60 · MP4"
  },
  {
    id: "j6pucr3g",
    title: "Synthwave Mix — Late Night Drive",
    channel: "Chill Records",
    status: "paused",
    progress: 58.1,
    size: "84 MB",
    downloaded: "49 MB",
    addedAt: new Date(Date.now() - 3600000),
    type: "music",
    format: "FLAC"
  },
  {
    id: "jcwbl7qs",
    title: "The Physics of Black Holes Explained",
    channel: "Two Minute Papers",
    status: "queued",
    addedAt: new Date(Date.now() - 7200000),
    type: "video",
    format: "4K60 · MP4"
  },
  {
    id: "jy8utkt8",
    title: "How Compilers Actually Work",
    channel: "ThePrimeagen",
    status: "paused",
    progress: 45.0,
    size: "210 MB",
    downloaded: "95 MB",
    addedAt: new Date(Date.now() - 10800000),
    type: "video",
    format: "1080p · MP4"
  },
  {
    id: "j3tap4c2",
    title: "Private Watch-Later Deep Dive",
    channel: "Two Minute Papers",
    status: "error",
    addedAt: new Date(Date.now() - 14400000),
    type: "video",
    format: "1080p · MP4",
    errorMessage: "Sign-in required. This video is private or age-restricted."
  },
  {
    id: "jh7q68hi",
    title: "Studio Session: Analog Warmth",
    channel: "Chill Records",
    status: "error",
    addedAt: new Date(Date.now() - 18000000),
    type: "music",
    format: "FLAC",
    errorMessage: "Ran out of retries after 3 attempts across web, android, and ios clients",
    errorDetails: `ERROR: [youtube] nsig extraction failed
  Retrying with player_client=android... failed
  Retrying with player_client=ios... failed
  Exhausted fallback chain (3/3)`
  }
];

export const QueueView = () => {
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [items] = useState<QueueItem[]>(mockItems);

  const filteredItems = items.filter((item) => {
    if (activeFilter === "all") return true;
    return item.status === activeFilter;
  });

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selected) => selected !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredItems.map((item) => item.id));
  };

  const handleSelectNone = () => {
    setSelectedIds([]);
  };

  const handleAction = (action: string, id: string) => {
    console.log(`Action ${action} on job ${id}`);
    // Implement actual action logic here
  };

  const handleBulkAction = (action: "pause" | "resume" | "retry" | "cancel") => {
    console.log(`Bulk ${action} on:`, selectedIds);
    // Implement actual bulk action logic here
    setSelectedIds([]);
  };

  const handleCopyLink = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.url) {
      navigator.clipboard.writeText(item.url);
      toast.success("Link copied to clipboard");
    } else {
      toast.error("No link available");
    }
  };

  const handleOpenFolder = (id: string) => {
    console.log(`Open folder for job ${id}`);
    toast.info("Opening destination folder...");
    // Implement actual folder opening logic
  };

  const handlePauseAll = () => {
    console.log("Pause all");
    // Implement pause all logic
  };

  // Update stats based on actual items
  const stats: QueueStats = {
    total: items.length,
    downloading: items.filter((i) => i.status === "downloading").length,
    paused: items.filter((i) => i.status === "paused").length,
    queued: items.filter((i) => i.status === "queued").length,
    error: items.filter((i) => i.status === "error").length
  };

  return (
    <div className="space-y-2">
      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        stats={stats}
        onPauseAll={handlePauseAll}
      />

      <BulkActions
        selectedCount={selectedIds.length}
        onSelectAll={handleSelectAll}
        totalCount={filteredItems.length}
        onSelectNone={handleSelectNone}
        onBulkAction={handleBulkAction}
      />

      <QueueList
        items={filteredItems}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onAction={handleAction}
        onCopyLink={handleCopyLink}
        onOpenFolder={handleOpenFolder}
      />
    </div>
  );
};
