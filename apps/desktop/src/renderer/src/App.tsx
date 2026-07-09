import { SideBar } from "@/features/ui/components/sidebar";
import { useNavigation } from "@renderer/providers/navigation-provider";

import { QueueShell } from "@/features/queue/components/shell";
import { LibraryShell } from "@/features/library/components/shell";
import { ChannelShell } from "@/features/channels/components/shell";
import { SettingsShell } from "@/features/settings/components/shell";

function App(): React.JSX.Element {
  const { currentView } = useNavigation();

  const renderView = () => {
    switch (currentView) {
      case "queue":
        return <QueueShell />;
      case "library":
        return <LibraryShell />;
      case "channel-sync":
        return <ChannelShell />;
      case "settings":
        return <SettingsShell />;
      default:
        return <QueueShell />;
    }
  };

  return (
    <main className="flex h-full">
      <SideBar />
      <div className="flex-1 overflow-auto px-2 pt-4 bg-background">{renderView()}</div>
    </main>
  );
}

export default App;
