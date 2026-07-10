import { SideBar } from "@/features/ui/components/sidebar";
import { useNavigationStore } from "@/stores/navigation/navigation.store";
import { selectCurrentView } from "@/stores/navigation/navigation.selectors";

import { LibraryView } from "@/features/library/components/shell";
import { ChannelView } from "@/features/channels/components/shell";
import { SettingsView } from "@/features/settings/components/shell";
import { LinkInput } from "@/features/ui/components/link-input";
import { QueueView } from "@/features/queue/components/shell";

function App(): React.JSX.Element {
  const currentView = useNavigationStore(selectCurrentView);

  const renderView = () => {
    switch (currentView) {
      case "queue":
        return <QueueView />;
      case "library":
        return <LibraryView />;
      case "channel-sync":
        return <ChannelView />;
      case "settings":
        return <SettingsView />;
      default:
        return <QueueView />;
    }
  };

  return (
    <main className="flex h-full overflow-hidden">
      <SideBar />

      <div className="flex flex-1 flex-col bg-background">
        <div className="border border-l-0 border-r-0 border-border py-4">
          <div className="mx-auto w-full max-w-[97%]">
            <LinkInput />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[97%] pb-5 pt-2">{renderView()}</div>
        </div>
      </div>
    </main>
  );
}

export default App;
