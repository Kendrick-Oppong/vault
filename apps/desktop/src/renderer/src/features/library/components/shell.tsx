import { useState, useMemo } from "react";
import { FilterTabs } from "./filter-tabs";
import { LibraryCard } from "./library-card";
import type { LibraryItem, LibrarySort, SortOrder, LibraryStats } from "../types";
import { EmptyState } from "@/features/ui/components/empty-state";
import { Search } from "lucide-react";
import { toast } from "sonner";

// Mock data - replace with real data later
const mockItems: LibraryItem[] = [
  {
    id: "1",
    title: "Electron + Vite: Full Setup Walkthrough",
    channel: "ThePrimeagen",
    type: "video",
    quality: "1080p",
    size: "300 MB",
    sizeBytes: 300 * 1024 * 1024,
    addedAt: new Date(Date.now() - 16 * 60000)
  },
  {
    id: "2",
    title: "How Compilers Actually Work",
    channel: "ThePrimeagen",
    type: "video",
    quality: "1080p",
    size: "210 MB",
    sizeBytes: 210 * 1024 * 1024,
    addedAt: new Date(Date.now() - 6 * 3600000)
  },
  {
    id: "3",
    title: "Building a Rust CLI from Scratch",
    channel: "Two Minute Papers",
    type: "music",
    quality: "FLAC",
    size: "120 MB",
    sizeBytes: 120 * 1024 * 1024,
    addedAt: new Date(Date.now() - 8 * 3600000)
  },
  {
    id: "4",
    title: "Deep Dive: React Server Components",
    channel: "Chill Records",
    type: "video",
    quality: "4K",
    size: "165 MB",
    sizeBytes: 165 * 1024 * 1024,
    addedAt: new Date(Date.now() - 15 * 3600000)
  },
  {
    id: "5",
    title: "Synthwave Mix — Late Night Drive",
    channel: "Chill Records",
    type: "video",
    quality: "720p",
    size: "210 MB",
    sizeBytes: 210 * 1024 * 1024,
    addedAt: new Date(Date.now() - 22 * 3600000),
    isRecovered: true
  },
  {
    id: "6",
    title: "The Physics of Black Holes Explained",
    channel: "ThePrimeagen",
    type: "music",
    quality: "FLAC",
    size: "255 MB",
    sizeBytes: 255 * 1024 * 1024,
    addedAt: new Date(Date.now() - 24 * 3600000)
  },
  {
    id: "7",
    title: "Electron + Vite: Full Setup Walkthrough",
    channel: "ThePrimeagen",
    type: "video",
    quality: "4K",
    size: "300 MB",
    sizeBytes: 300 * 1024 * 1024,
    addedAt: new Date(Date.now() - 48 * 3600000)
  },
  {
    id: "8",
    title: "Lo-fi Beats for Deep Focus",
    channel: "ThePrimeagen",
    type: "video",
    quality: "720p",
    size: "345 MB",
    sizeBytes: 345 * 1024 * 1024,
    addedAt: new Date(Date.now() - 72 * 3600000)
  },
  {
    id: "9",
    title: "How Compilers Actually Work",
    channel: "Two Minute Papers",
    type: "music",
    quality: "FLAC",
    size: "390 MB",
    sizeBytes: 390 * 1024 * 1024,
    addedAt: new Date(Date.now() - 96 * 3600000)
  }
];

export const LibraryView = () => {
  const [sortBy, setSortBy] = useState<LibrarySort>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedItems = useMemo(() => {
    const filtered = mockItems.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.channel.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = a.addedAt.getTime() - b.addedAt.getTime();
          break;
        case "size":
          comparison = a.sizeBytes - b.sizeBytes;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [searchQuery, sortBy, sortOrder]);

  const handleSortChange = (sort: LibrarySort) => {
    if (sort === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(sort);
      setSortOrder("desc");
    }
  };

  const handleSortOrderChange = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handlePlay = (id: string) => {
    const item = mockItems.find((i) => i.id === id);
    console.log("Playing:", item?.title);
    toast.success(`Playing: ${item?.title}`);
    // Implement actual play logic
  };

  const handleOpenFolder = (id: string) => {
    const item = mockItems.find((i) => i.id === id);
    console.log("Opening folder for:", item?.title);
    toast.info(`Opening folder for ${item?.title}`);
    // Implement actual folder opening logic
  };

  const handleCopyLink = (id: string) => {
    const item = mockItems.find((i) => i.id === id);
    // For demo purposes, using a mock URL
    const mockUrl = `https://youtube.com/watch?v=${item?.id}`;
    navigator.clipboard.writeText(mockUrl);
    toast.success("Link copied to clipboard");
  };

  const handleDelete = (id: string) => {
    const item = mockItems.find((i) => i.id === id);
    console.log("Deleting:", item?.title);
    toast.warning(`Deleted: ${item?.title}`);
    // Implement actual delete logic
  };

  // Calculate stats
  const totalSizeBytes = mockItems.reduce((acc, item) => acc + item.sizeBytes, 0);
  const totalSize = formatBytes(totalSizeBytes);
  const stats: LibraryStats = {
    total: mockItems.length,
    totalSize,
    totalSizeBytes
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-2">
        <p className="text-[13px] font-semibold text-muted-foreground whitespace-nowrap">
          {stats.total} items · {stats.totalSize}
        </p>
        <div className="flex-1 max-w-1/2">
          <FilterTabs
            sortBy={sortBy}
            sortOrder={sortOrder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSortChange={handleSortChange}
            onSortOrderChange={handleSortOrderChange}
          />
        </div>
      </div>

      {filteredAndSortedItems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {filteredAndSortedItems.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              onPlay={handlePlay}
              onOpenFolder={handleOpenFolder}
              onCopyLink={handleCopyLink}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}
