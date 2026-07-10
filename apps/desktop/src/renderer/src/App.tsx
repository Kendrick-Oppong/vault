import { SideBar } from "@/features/ui/components/sidebar";
import { useNavigationStore } from "@/stores/navigation/navigation.store";
import { selectCurrentView } from "@/stores/navigation/navigation.selectors";

import { QueueShell } from "@/features/queue/components/shell";
import { LibraryShell } from "@/features/library/components/shell";
import { ChannelShell } from "@/features/channels/components/shell";
import { SettingsShell } from "@/features/settings/components/shell";
import { LinkInput } from "@/features/ui/components/link-input";

function App(): React.JSX.Element {
  const currentView = useNavigationStore(selectCurrentView);

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
      <div className="flex-1 overflow-auto pt-4 bg-background">
        <div className="max-w-[97%] mx-auto">
          <LinkInput />
          {renderView()}
        </div>
      </div>
    </main>
  );
}

export default App;
