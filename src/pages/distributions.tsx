import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WslDistribution {
  name: string;
  state: string;
  version: number;
  is_default: boolean;
}

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<WslDistribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function fetchDistributions() {
    invoke<WslDistribution[]>("list_wsl_distributions")
      .then((data) => {
        setDistributions(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchDistributions();
    const interval = setInterval(fetchDistributions, 3000);
    return () => clearInterval(interval);
  }, []);

  function handleStart(name: string) {
    setActionLoading(name);
    invoke("start_wsl_distribution", { name })
      .then(() => fetchDistributions())
      .catch((err) => setError(String(err)))
      .finally(() => setActionLoading(null));
  }

  function handleStop(name: string) {
    setActionLoading(name);
    invoke("stop_wsl_distribution", { name })
      .then(() => fetchDistributions())
      .catch((err) => setError(String(err)))
      .finally(() => setActionLoading(null));
  }

  const isRunning = (state: string) => state.toLowerCase() === "running";

  if (loading) {
    return <p className="text-muted-foreground">Loading WSL distributions...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  if (distributions.length === 0) {
    return (
      <p className="text-muted-foreground">
        No WSL distributions found. Install one with{" "}
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">wsl --install</code>.
      </p>
    );
  }

  return (
    <table className="w-full max-w-xl border-collapse">
      <thead>
        <tr className="border-b border-border text-left">
          <th className="w-8 px-3 py-2 text-muted-foreground text-sm font-medium" />
          <th className="px-3 py-2 text-muted-foreground text-sm font-medium">Name</th>
          <th className="px-3 py-2 text-muted-foreground text-sm font-medium">State</th>
          <th className="px-3 py-2 text-muted-foreground text-sm font-medium">Version</th>
          <th className="px-3 py-2 text-muted-foreground text-sm font-medium">Actions</th>
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
                <span className="text-primary font-bold" title="Default">*</span>
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
                  disabled={actionLoading === d.name}
                >
                  <Square className="h-3 w-3" />
                  Stop
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStart(d.name)}
                  disabled={actionLoading === d.name}
                >
                  <Play className="h-3 w-3" />
                  Start
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
