import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import DistributionsPage from "@/pages/distributions";

function App() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">发行版列表</h1>
          </div>
          <div className="flex-1 p-6">
            <DistributionsPage />
          </div>
        </main>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default App;
