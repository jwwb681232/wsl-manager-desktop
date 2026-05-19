import { Loader2, Play, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDistributions } from "@/hooks/use-distributions";

export default function DistributionsPage() {
  const { t } = useTranslation();
  const {
    distributions,
    error,
    loading,
    actionLoading,
    handleStart,
    handleStop,
  } = useDistributions();

  const isRunning = (state: string) => state.toLowerCase() === "running";

  if (loading) {
    return <p className="text-muted-foreground">{t("distributions.loading")}</p>;
  }

  if (error) {
    return <p className="text-destructive">{t("error.title")}: {error}</p>;
  }

  if (distributions.length === 0) {
    return (
      <p className="text-muted-foreground">
        {t("distributions.noWsl")}{" "}
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">wsl --install</code>
        {t("distributions.install")}
      </p>
    );
  }

  return (
    <table className="w-full max-w-2xl border-collapse">
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
            <td className="px-3 py-2 text-sm">{d.name}</td>
            <td className="px-3 py-2 text-sm">{d.state}</td>
            <td className="px-3 py-2 text-sm">WSL {d.version}</td>
            <td className="px-3 py-2 text-sm">
              {isRunning(d.state) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStop(d.name)}
                  disabled={actionLoading.has(d.name)}
                >
                  {actionLoading.has(d.name) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  {t("distributions.stop")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStart(d.name)}
                  disabled={actionLoading.has(d.name)}
                >
                  {actionLoading.has(d.name) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {t("distributions.start")}
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
