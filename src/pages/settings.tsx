import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/ThemeProvider";

const INTERVAL_OPTIONS = [2, 5, 10, 15, 30, 60];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [pollInterval, setPollInterval] = useState(5);

  useEffect(() => {
    invoke<number>("get_polling_interval").then(setPollInterval).catch(() => {});
  }, []);

  function handleIntervalChange(secs: number) {
    setPollInterval(secs);
    invoke("set_polling_interval", { secs }).catch(() => {});
  }

  function handleLanguageChange(lang: string) {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem("language", lang);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-xl font-semibold">{t("settings.title")}</h2>

      <div>
        <label className="text-sm font-medium">{t("settings.language")}</label>
        <select
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">{t("settings.theme")}</label>
        <select
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={theme}
          onChange={(e) => setTheme(e.target.value as "system" | "light" | "dark")}
        >
          <option value="system">{t("settings.system")}</option>
          <option value="light">{t("settings.light")}</option>
          <option value="dark">{t("settings.dark")}</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">
          {t("settings.polling")} ({pollInterval} {t("settings.seconds")})
        </label>
        <div className="mt-1 flex gap-2 flex-wrap">
          {INTERVAL_OPTIONS.map((secs) => (
            <button
              key={secs}
              className={
                "px-3 py-1 text-sm rounded-md border " +
                (pollInterval === secs
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted")
              }
              onClick={() => handleIntervalChange(secs)}
            >
              {secs}s
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {t("settings.about")}: {t("settings.version")} 0.1.0
        </p>
      </div>
    </div>
  );
}
