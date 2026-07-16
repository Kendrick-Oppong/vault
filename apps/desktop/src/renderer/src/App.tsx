import { SideBar } from "@/features/ui/components/sidebar";
import { useNavigationStore } from "@/stores/navigation/navigation.store";
import { selectCurrentView } from "@/stores/navigation/navigation.selectors";
import { AlertBanners } from "@/features/ui/components/alert-banners";
import { GlobalModals } from "@/features/ui/components/global-modals";
import { useJobEvents } from "@/lib/event-listeners/use-job-events";
import { useAppInfoInit } from "@/lib/event-listeners/use-app-info-init";
import { OnboardingScreen } from "@/features/onboarding/components/onboarding-screen";
import { useOnboardingState } from "@/stores/onboarding/onboarding.selectors";

import { LibraryView } from "@/features/library/components/shell";
import { SettingsView } from "@/features/settings/components/shell";
import { LinkInput } from "@/features/ui/components/link-input";
import { QueueView } from "@/features/queue/components/shell";

function App(): React.JSX.Element {
  const currentView = useNavigationStore(selectCurrentView);
  const { completed: onboardingCompleted } = useOnboardingState();

  // Initialize app with real system data (app version, yt-dlp version, default path)
  useAppInfoInit();
  // Subscribe to job lifecycle events from the main process
  useJobEvents();

  if (!onboardingCompleted) {
    return <OnboardingScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case "queue":
        return <QueueView />;
      case "library":
        return <LibraryView />;
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
        <AlertBanners />

        <div className="border border-l-0 border-r-0 border-border py-4">
          <div className="mx-auto w-full max-w-[97%]">
            <LinkInput />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[97%] pb-5 pt-2">{renderView()}</div>
        </div>
      </div>
      <GlobalModals />
    </main>
  );
}

export default App;
