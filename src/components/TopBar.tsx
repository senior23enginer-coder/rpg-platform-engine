import { Bell, Box, Monitor, Settings } from "lucide-react";
import type { PlayerProfile } from "../types/profile";
import { resolveUserAsset } from "../lib/userLibrary";
import type { AppNotificationEntry } from "../lib/appMetadataStorage";
import { useEffect, useState } from "react";
import { t } from "../lib/i18n";

type Props = {
  profile: PlayerProfile;
  platformName?: string;
  appVersion?: string;
  assetOverrides?: Record<string, string>;
  notifications?: AppNotificationEntry[];
  onProfile: () => void;
  onSettings: () => void;
};

export function TopBar({ profile, platformName = "RPG Platform Engine", appVersion = "0.10-1625", assetOverrides, notifications = [], onProfile, onSettings }: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const avatarPath = resolveUserAsset(profile, profile.avatar);
  const logoPath = assetOverrides?.["topbar.logo"];
  const visibleNotifications = notifications
    .filter((entry) => entry.status === "sent" || (entry.status === "scheduled" && entry.scheduledAt && new Date(entry.scheduledAt).getTime() <= Date.now()))
    .filter((entry) =>
      entry.target === "all" ||
      entry.target === "platform" ||
      entry.target === (profile.role === "admin" ? "admins" : "users") ||
      (entry.target === "user" && entry.targetUserId === profile.id)
    )
    .sort((left, right) => new Date(right.sentAt ?? right.scheduledAt ?? right.createdAt).getTime() - new Date(left.sentAt ?? left.scheduledAt ?? left.createdAt).getTime())
    .slice(0, 6);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="topbar-gear">{logoPath ? <img src={logoPath} alt="" /> : <Settings size={44} />}</span>
        <strong>{platformName}</strong>
        <span>{t(profile.settings.language, "brand.tagline")}</span>
      </div>

      <div className="status-cluster">
        <div className="status-card">
          <Monitor size={24} />
          <span>
            <small>{t(profile.settings.language, "status.system")}</small>
            <strong>{isOnline ? "Conexion" : "Sin conexion"}</strong>
          </span>
        </div>

        <div className="status-card version-status-card">
          <i />
          <span>
            <small>Version</small>
            <strong>{appVersion}</strong>
          </span>
        </div>

        <button className="status-card profile-card" onClick={onProfile}>
          {avatarPath ? (
            <img
              className="topbar-profile-avatar"
              src={avatarPath}
              alt=""
              style={{
                objectPosition: `${profile.avatarFit?.x ?? 50}% ${profile.avatarFit?.y ?? 50}%`,
                transform: `scale(${profile.avatarFit?.scale ?? 1})`,
              }}
            />
          ) : <Box size={24} />}
          <span>
            <small>{profile.name}</small>
            <strong>{t(profile.settings.language, "profile.level")} {profile.level}</strong>
            <i className="profile-meter" />
          </span>
        </button>

        <div className="notification-center">
          <button className="square-button topbar-action-button notification-bell" onClick={() => setShowNotifications((value) => !value)} aria-label={t(profile.settings.language, "notifications.title")}>
            <Bell size={22} />
            {visibleNotifications.length > 0 && <i>{visibleNotifications.length}</i>}
          </button>
          {showNotifications && (
            <div className="notification-popover">
              <strong>{t(profile.settings.language, "notifications.title")}</strong>
              {visibleNotifications.length ? visibleNotifications.map((entry) => (
                <section key={entry.id} className={`mobile-notification priority-${entry.priority}`}>
                  <span className="mobile-icon"><Bell size={15} /></span>
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{entry.message}</p>
                    <small>{entry.platform} - {entry.channel}</small>
                  </div>
                </section>
              )) : <p>{t(profile.settings.language, "notifications.empty")}</p>}
            </div>
          )}
        </div>

        <button
          type="button"
          className="square-button topbar-action-button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSettings();
          }}
          aria-label="Abrir configuracion"
          title="Abrir configuracion"
        >
          <Settings size={22} />
        </button>
      </div>
    </header>
  );
}
