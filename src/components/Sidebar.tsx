import {
  Archive,
  Bell,
  BookOpen,
  Dice5,
  Folder,
  Home,
  LogOut,
  Map,
  Newspaper,
  Plus,
  Settings,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { Screen } from "../screens/types";
import { t } from "../lib/i18n";
import type { LanguageCode } from "../types/profile";

type Props = {
  active: Screen;
  appVersion: string;
  assetOverrides?: Record<string, string>;
  isAdmin?: boolean;
  language?: LanguageCode;
  onChange: (screen: Screen) => void;
  onExit: () => void;
};

const items: Array<{ id: Screen; labelKey: Parameters<typeof t>[1]; hintKey: Parameters<typeof t>[1]; icon: JSX.Element }> = [
  { id: "home", labelKey: "nav.home", hintKey: "nav.homeHint", icon: <Home /> },
  { id: "library", labelKey: "nav.library", hintKey: "nav.libraryHint", icon: <BookOpen /> },
  { id: "newGame", labelKey: "nav.newGame", hintKey: "nav.newGameHint", icon: <Plus /> },
  { id: "load", labelKey: "nav.load", hintKey: "nav.loadHint", icon: <Archive /> },
  { id: "dice", labelKey: "nav.dice", hintKey: "nav.diceHint", icon: <Dice5 /> },
  { id: "settings", labelKey: "nav.settings", hintKey: "nav.settingsHint", icon: <Settings /> },
  { id: "files", labelKey: "nav.files", hintKey: "nav.filesHint", icon: <Folder /> },
];

const adminItems: Array<{ id: Screen; labelKey: Parameters<typeof t>[1]; hintKey: Parameters<typeof t>[1]; icon: JSX.Element }> = [
  { id: "admin", labelKey: "nav.admin", hintKey: "nav.adminHint", icon: <ShieldCheck /> },
  { id: "adminGames", labelKey: "nav.adminGames", hintKey: "nav.adminGamesHint", icon: <BookOpen /> },
  { id: "adminMaps", labelKey: "nav.adminMaps", hintKey: "nav.adminMapsHint", icon: <Map /> },
  { id: "adminUsers", labelKey: "nav.adminUsers", hintKey: "nav.adminUsersHint", icon: <UserCog /> },
  { id: "adminNotifications", labelKey: "nav.adminNotifications", hintKey: "nav.adminNotificationsHint", icon: <Bell /> },
  { id: "adminNews", labelKey: "nav.adminNews", hintKey: "nav.adminNewsHint", icon: <Newspaper /> },
  { id: "settings", labelKey: "nav.settings", hintKey: "nav.settingsHint", icon: <Settings /> },
];

const uiuxIconByScreen: Partial<Record<Screen | "exit", string>> = {
  home: "/platform/uiux-icons/home.png",
  library: "/platform/uiux-icons/library.png",
  newGame: "/platform/uiux-icons/newGame.png",
  load: "/platform/uiux-icons/load.png",
  dice: "/platform/uiux-icons/dice.png",
  settings: "/platform/uiux-icons/settings.png",
  files: "/platform/uiux-icons/files.png",
  admin: "/platform/uiux-icons/settings.png",
  adminGames: "/platform/uiux-icons/library.png",
  adminMaps: "/platform/uiux-icons/files.png",
  adminUsers: "/platform/uiux-icons/settings.png",
  adminNotifications: "/platform/uiux-icons/settings.png",
  adminNews: "/platform/uiux-icons/files.png",
  exit: "/platform/uiux-icons/exit.png",
};

export function Sidebar({ active, appVersion, assetOverrides, isAdmin = false, language = "es", onChange, onExit }: Props) {
  const useUiuxRail = active === "settings";
  const visibleItems = isAdmin ? adminItems : items;

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="gear-mark">
          {useUiuxRail ? <img src={assetOverrides?.["platform.logo"] ?? "/platform/uiux-icons/brand-gear.png"} alt="" /> : <Settings size={40} />}
        </div>
        <div>
          <h1>RPG Platform Engine</h1>
          <p>{t(language, "brand.shortTagline")}</p>
        </div>
      </div>

      <nav className="nav-list">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "selected" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <span className="nav-icon">
              {useUiuxRail ? <img src={assetOverrides?.[`sidebar.${item.id}`] ?? uiuxIconByScreen[item.id]} alt="" /> : item.icon}
            </span>
            <span>
              <strong>{t(language, item.labelKey)}</strong>
              <small>{t(language, item.hintKey)}</small>
            </span>
          </button>
        ))}

        <button className="nav-item exit" onClick={onExit}>
          <span className="nav-icon">
            {useUiuxRail ? <img src={uiuxIconByScreen.exit} alt="" /> : <LogOut />}
          </span>
          <span>
            <strong>{t(language, "nav.exit")}</strong>
            <small>{t(language, "nav.exitHint")}</small>
          </span>
        </button>
      </nav>

      <div className="version-row">
        <span>{t(language, "nav.version")} {appVersion}</span>
        <span className="stable-dot">{t(language, "nav.stable")}</span>
      </div>
    </aside>
  );
}
