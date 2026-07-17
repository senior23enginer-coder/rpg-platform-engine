import { Activity, Bell, Box, ChevronDown, Monitor, Settings } from "lucide-react";
import type { PlayerProfile } from "../types/profile";
import { resolveUserAsset } from "../lib/userLibrary";
import type { AppNotificationEntry } from "../lib/appMetadataStorage";
import { useState } from "react";
import { t } from "../lib/i18n";

type Props = {
  profile: PlayerProfile;
  assetOverrides?: Record<string, string>;
  notifications?: AppNotificationEntry[];
  onProfile: () => void;
  onSettings: () => void;
};

export function TopBar({ profile, assetOverrides, notifications = [], onProfile, onSettings }: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const avatarPath = resolveUserAsset(profile, profile.avatar);
  const logoPath = assetOverrides?.["topbar.logo"];
  const visibleNotifications = notifications
    .filter((entry) => entry.status === "sent" || (entry.status === "scheduled" && entry.scheduledAt && new Date(entry.scheduledAt).getTime() <= Date.now()))
    .filter((entry) => entry.target === "all" || entry.target === (profile.role === "admin" ? "admins" : "users"))
    .sort((left, right) => new Date(right.sentAt ?? right.scheduledAt ?? right.createdAt).getTime() - new Date(left.sentAt ?? left.scheduledAt ?? left.createdAt).getTime())
    .slice(0, 6);

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="topbar-gear">{logoPath ? <img src={logoPath} alt="" /> : <Settings size={44} />}</span>
        <strong>RPG Platform Engine</strong>
        <span>{t(profile.settings.language, "brand.tagline")}</span>
      </div>

      <div className="status-cluster">
        <div className="status-card">
          <Monitor size={24} />
          <span>
            <small>{t(profile.settings.language, "status.system")}</small>
            <strong>{t(profile.settings.language, "status.ok")}</strong>
          </span>
        </div>

        <div className="status-card">
          <Activity size={24} />
          <span>
            <small>{t(profile.settings.language, "status.audio")}</small>
            <strong>{profile.settings.audioEnabled ? t(profile.settings.language, "status.enabled") : t(profile.settings.language, "status.disabled")}</strong>
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
          <button className="square-button notification-bell" onClick={() => setShowNotifications((value) => !value)} aria-label={t(profile.settings.language, "notifications.title")}>
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

        <button className="square-button" onClick={onSettings}>
          <Settings size={22} />
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
