import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportDialog({ open: isOpen, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [installPath, setInstallPath] = useState("");
  const [tarPath, setTarPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSelectPath() {
    const selected = await open({ directory: true });
    if (selected) setInstallPath(selected);
  }

  async function handleSelectFile() {
    const selected = await open({
      filters: [{ name: "Tar", extensions: ["tar", "tar.gz", "tgz"] }],
    });
    if (selected) setTarPath(selected);
  }

  async function handleImport() {
    if (!name || !installPath || !tarPath) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("import_distribution", { name, installPath, tarPath });
      onImported();
      onClose();
      setName("");
      setInstallPath("");
      setTarPath("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">{t("import.title")}</h3>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div>
          <label className="text-sm font-medium">{t("import.name")}</label>
          <input
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder={t("import.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t("import.installPath")}</label>
          <div className="mt-1 flex gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={installPath}
              readOnly
              placeholder="C:\\..."
            />
            <Button variant="outline" size="sm" onClick={handleSelectPath}>
              {t("import.selectPath")}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">{t("import.tarFile")}</label>
          <div className="mt-1 flex gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={tarPath}
              readOnly
              placeholder="file.tar"
            />
            <Button variant="outline" size="sm" onClick={handleSelectFile}>
              {t("import.selectFile")}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            {t("distributions.cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !name || !installPath || !tarPath}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {loading ? t("import.importing") : t("import.import_btn")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Re-export save for export dialog use
export async function showSaveDialog() {
  return await save({
    filters: [{ name: "Tar", extensions: ["tar"] }],
  });
}
