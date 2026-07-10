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
    <main className="flex h-full overflow-hidden">
      <SideBar />

      <div className="flex flex-1 flex-col bg-background">
        <div className="mx-auto flex h-full w-full max-w-[97%] flex-col">
          <div className="py-4">
            <LinkInput />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">{renderView()}</div>
        </div>
      </div>
    </main>
  );
}

export default App;
