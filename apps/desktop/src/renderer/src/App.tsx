import { SideBar } from "@/features/ui/components/sidebar";
import { useNavigation } from "@/features/ui/contexts/navigation-context";

function App(): React.JSX.Element {
  const { currentView } = useNavigation();

  return (
    <main className="flex flex-1 min-h-0">
      <SideBar />
      <div className="flex-1 overflow-auto">
        <h1>{currentView}</h1>
      </div>
    </main>
  );
}

export default App;
