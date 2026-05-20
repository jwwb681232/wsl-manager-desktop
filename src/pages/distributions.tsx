import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  Loader2,
  Play,
  Square,
  Terminal,
  Star,
  ArrowLeftRight,
  Download,
  Trash2,
  Cpu,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDistributions } from "@/hooks/use-distributions";
import ImportDialog from "@/components/ImportDialog";
import type { ResourceInfo } from "@/types/wsl";

export default function DistributionsPage() {
  const { t } = useTranslation();
  const {
    distributions,
    error,
    loading,
    actionLoading,
    handleStart,
    handleStop,
    refresh,
  } = useDistributions();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [resources, setResources] = useState<Record<string, ResourceInfo>>({});

  const isRunning = (state: string) => state.toLowerCase() === "running";

  function handleSetDefault(name: string) {
    invoke("set_default_distribution", { name })
      .then(() => refresh())
      .catch((err) => alert(String(err)));
  }

  function handleConvert(name: string, targetVersion: number) {
    invoke("convert_distribution_version", { name, version: targetVersion })
      .then(() => refresh())
      .catch((err) => alert(String(err)));
  }

  async function handleExport(name: string) {
    const filePath = await save({
      defaultPath: `${name}.tar`,
      filters: [{ name: "Tar", extensions: ["tar"] }],
    });
    if (!filePath) return;
    invoke("export_distribution", { name, path: filePath })
      .then(() => alert(`Exported to ${filePath}`))
      .catch((err) => alert(String(err)));
  }

  function handleDelete(name: string) {
    invoke("unregister_distribution", { name })
      .then(() => {
        setDeleteTarget(null);
        refresh();
      })
      .catch((err) => alert(String(err)));
  }

  function handleOpenTerminal(name: string) {
    invoke("open_wsl_terminal", { name }).catch((err) => alert(String(err)));
  }

  function handleFetchResources(name: string) {
    invoke<ResourceInfo>("get_distribution_resources", { name })
      .then((r) => setResources((prev) => ({ ...prev, [name]: r })))
      .catch(() => {});
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("distributions.loading")}</p>;
  }

  if (error) {
    return <p className="text-destructive">{t("error.title")}: {error}</p>;
  }

  if (distributions.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">
          {t("distributions.noWsl")}{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">wsl --install</code>
          {t("distributions.install")}
        </p>
        <Button variant="outline" onClick={() => setShowImport(true)}>
          {t("distributions.import")}
        </Button>
        <ImportDialog
          open={showImport}
          onClose={() => setShowImport(false)}
          onImported={refresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          {t("distributions.import")}
        </Button>
      </div>

      <table className="w-full max-w-4xl border-collapse">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="w-8 px-3 py-2 text-muted-foreground text-sm font-medium" />
            <th className="px-3 py-2 text-muted-foreground text-sm font-medium">
              {t("distributions.name")}
            </th>
            <th className="px-3 py-2 text-muted-foreground text-sm font-medium">
              {t("distributions.state")}
            </th>
            <th className="px-3 py-2 text-muted-foreground text-sm font-medium">
              {t("distributions.version")}
            </th>
            <th className="px-3 py-2 text-muted-foreground text-sm font-medium">
              {t("distributions.resources")}
            </th>
            <th className="px-3 py-2 text-muted-foreground text-sm font-medium">
              {t("distributions.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {distributions.map((d) => (
            <tr
              key={d.name}
              className={
                "border-b border-border " +
                (d.is_default ? "bg-primary/10" : "")
              }
            >
              <td className="px-3 py-2 text-sm">
                {d.is_default && (
                  <span className="text-primary font-bold" title={t("distributions.default")}>
                    *
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-sm">
                <Link
                  to={`/distribution/${encodeURIComponent(d.name)}`}
                  className="text-primary hover:underline"
                >
                  {d.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-sm">{d.state}</td>
              <td className="px-3 py-2 text-sm">WSL {d.version}</td>
              <td className="px-3 py-2 text-sm">
                {isRunning(d.state) ? (
                  <div className="flex items-center gap-1">
                    {resources[d.name] ? (
                      <span className="text-xs text-muted-foreground">
                        {resources[d.name].cpu_percent.toFixed(1)}%{" "}
                        {resources[d.name].memory_mb.toFixed(0)} MB
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleFetchResources(d.name)}
                      >
                        <Cpu className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleOpenTerminal(d.name)}
                  >
                    <Terminal className="h-3 w-3" />
                  </Button>

                  {isRunning(d.state) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleStop(d.name)}
                      disabled={actionLoading.has(d.name)}
                    >
                      {actionLoading.has(d.name) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Square className="h-3 w-3" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleStart(d.name)}
                      disabled={actionLoading.has(d.name)}
                    >
                      {actionLoading.has(d.name) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                  )}

                  {!d.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleSetDefault(d.name)}
                      title={t("distributions.setAsDefault")}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}

                  <Link to={`/distribution/${encodeURIComponent(d.name)}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Info className="h-3 w-3" />
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      handleConvert(d.name, d.version === 1 ? 2 : 1)
                    }
                    title={d.version === 1 ? t("distributions.convertTo2") : t("distributions.convertTo1")}
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleExport(d.name)}
                    title={t("distributions.export")}
                  >
                    <Download className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => setDeleteTarget(d.name)}
                    title={t("distributions.delete")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold">{t("distributions.deleteConfirm")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("distributions.deleteMessage")} <strong>{deleteTarget}</strong>?
            </p>
            <p className="text-sm text-destructive">{t("distributions.deleteWarning")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                {t("distributions.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteTarget)}
              >
                {t("distributions.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refresh}
      />
    </div>
  );
}
