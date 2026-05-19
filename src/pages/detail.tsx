import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DistributionDetail } from "@/types/wsl";

export default function DetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [detail, setDetail] = useState<DistributionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    invoke<DistributionDetail>("get_distribution_detail", { name })
      .then((d) => {
        setDetail(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [name]);

  if (loading) {
    return <p className="text-muted-foreground">{t("distributions.loading")}</p>;
  }

  if (error || !detail) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
        <ArrowLeft className="h-4 w-4" />
        {t("detail.back")}
      </Button>

      <h2 className="text-xl font-semibold">{detail.name}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-sm text-muted-foreground">{t("detail.name")}</div>
        <div className="text-sm">{detail.name}</div>

        <div className="text-sm text-muted-foreground">{t("detail.state")}</div>
        <div className="text-sm">{detail.state}</div>

        <div className="text-sm text-muted-foreground">{t("detail.version")}</div>
        <div className="text-sm">WSL {detail.version}</div>

        <div className="text-sm text-muted-foreground">{t("detail.default")}</div>
        <div className="text-sm">
          {detail.is_default ? t("detail.yes") : t("detail.no")}
        </div>

        <div className="text-sm text-muted-foreground">{t("detail.defaultUser")}</div>
        <div className="text-sm">{detail.default_user}</div>
      </div>

      {detail.disk_info && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">{t("detail.diskInfo")}</p>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {detail.disk_info}
          </pre>
        </div>
      )}
    </div>
  );
}
