import { Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import DistributionsPage from "@/pages/distributions";
import { useTranslation } from "react-i18next";

function Layout() {
  const { t } = useTranslation();

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">{t("distributions.title")}</h1>
        </div>
        <div className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<DistributionsPage />} />
          </Routes>
        </div>
      </main>
    </SidebarProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Layout />
    </TooltipProvider>
  );
}

export default App;
