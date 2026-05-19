import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { WslDistribution } from "@/types/wsl";

export function useDistributions() {
  const [distributions, setDistributions] = useState<WslDistribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  const fetchDistributions = useCallback(() => {
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
  }, []);

  useEffect(() => {
    fetchDistributions();

    const unlistenPromise = listen<WslDistribution[]>(
      "wsl-state-changed",
      (event) => {
        setDistributions(event.payload);
        setError(null);
        setLoading(false);
      },
    );

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [fetchDistributions]);

  function handleStart(name: string) {
    setActionLoading((prev) => new Set(prev).add(name));
    invoke("start_wsl_distribution", { name })
      .then(() => fetchDistributions())
      .catch((err) => setError(String(err)))
      .finally(() =>
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        }),
      );
  }

  function handleStop(name: string) {
    setActionLoading((prev) => new Set(prev).add(name));
    invoke("stop_wsl_distribution", { name })
      .then(() => fetchDistributions())
      .catch((err) => setError(String(err)))
      .finally(() =>
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        }),
      );
  }

  return {
    distributions,
    error,
    loading,
    actionLoading,
    handleStart,
    handleStop,
    refresh: fetchDistributions,
  };
}
