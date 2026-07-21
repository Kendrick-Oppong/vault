import { SideBar } from "@/features/ui/components/sidebar";
import { useNavigationStore } from "@/stores/navigation/navigation.store";
import { selectCurrentView } from "@/stores/navigation/navigation.selectors";
import { AlertBanners } from "@/features/ui/components/alert-banners";
import { GlobalModals } from "@/features/ui/components/global-modals";
import { useAppInfoInit } from "@/lib/event-listeners/use-app-info-init";
import { useUpdateEvents } from "@/lib/event-listeners/use-update-events";
import { useSystemEvents } from "@/lib/event-listeners/use-system-events";
import { OnboardingScreen } from "@/features/onboarding/components/onboarding-screen";
import { useOnboardingState } from "@/stores/onboarding/onboarding.selectors";
import { CustomTitlebar } from "@/features/ui/components/custom-titlebar";

import { HistoryView } from "@/features/history/components/shell";
import { SettingsView } from "@/features/settings/components/shell";
import { QueueView } from "@/features/queue/components/shell";
import { LogsView } from "@/features/logs/components/logs-view";

function App(): React.JSX.Element {
  const currentView = useNavigationStore(selectCurrentView);
  const { completed: onboardingCompleted } = useOnboardingState();
  useAppInfoInit();
  useUpdateEvents();
  useSystemEvents();

  if (!onboardingCompleted) {
    return <OnboardingScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case "queue":
        return <QueueView />;
      case "history":
        return <HistoryView />;
      case "settings":
        return <SettingsView />;
      case "logs":
        return <LogsView />;
      default:
        return <QueueView />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <CustomTitlebar title="Vault - YouTube Downloader" />
      <main className="flex flex-1 overflow-hidden">
        <SideBar />

        <div className="flex flex-1 flex-col bg-background">
          <AlertBanners />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[97%] pb-5 pt-2">{renderView()}</div>
          </div>
        </div>

        <GlobalModals />
      </main>
    </div>
  );
}

export default App;
