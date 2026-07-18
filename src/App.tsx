import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import "./styles/app.css";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { AdminScreen } from "./screens/AdminScreen";
import { AdminPlatformSettings } from "./screens/AdminPlatformSettings";
import { AuthScreen } from "./screens/AuthScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { ContentScreen } from "./screens/ContentScreen";
import { DiceScreen } from "./screens/DiceScreen";
import { FilesScreen } from "./screens/FilesScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { LoadGameScreen } from "./screens/LoadGameScreen";
import { JsonEditorScreen } from "./screens/JsonEditorScreen";
import { NewGameScreen } from "./screens/NewGameScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { RulesScreen } from "./screens/RulesScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SupportScreen } from "./screens/SupportScreen";
import type { Screen } from "./screens/types";
import type { AudioManifest, GameConfig, GameJsonFile, GameMap } from "./types/game";
import type { GameHistoryEntry, PlayerProfile, PlayerSave, UserSettings } from "./types/profile";
import { createActivity, createAuditEntry, loadAppMetadata, normalizeMetadata } from "./lib/appMetadataStorage";
import type { AppMetadata, AppNewsEntry, AppNotificationEntry } from "./lib/appMetadataStorage";
import { createPlatformRepository } from "./lib/platformRepository";
import type { PlatformSession } from "./lib/platformContracts";
import { seedAudioManifest, seedCharacters } from "./lib/seedLibrary";
import { loadBundledGameJsonFiles, loadBundledGames, loadGameAudioManifest, normalizeGameConfig } from "./lib/gameLibrary";
import { loadBundledUserProfiles } from "./lib/userLibrary";
import { createSaveGameDocument, getSaveGamePath } from "./lib/saveGameStorage";
import { writeText } from "./lib/tauriFs";
import {
  loadNativeMetadata,
  loadNativeProfile,
  loadPersistentUsers,
  savePersistentGameDocument,
  savePersistentMetadata,
  savePersistentProfile,
  savePersistentUsers,
} from "./lib/storageAdapter";
import {
  getActiveCampaign,
  getActiveSave,
  getGameSaves,
  createDefaultProfile,
  loadProfile,
  normalizeProfile,
} from "./lib/playerProfile";

import { playTrack, setMusicVolume, stopAudio } from "./lib/audioEngine";

const bundledGames = loadBundledGames();
const loginFallout4MainTheme = "/games/fallout4/audio/sounds/fallout_4_soundtrack_score/01%20Fallout%204%20Main%20Theme.mp3";
const adminScreens = ["admin", "adminSettings", "adminSupport", "adminGames", "adminGenerator", "adminMaps", "adminUsers", "adminNotifications", "adminNews"] as const;
const disabledGamesKey = "rpg-platform.disabled-games.v1";
const sessionScreenKey = "rpg-platform.session-screen.v1";
const backendSessionKey = "rpg-platform.backend-session.v1";
const sessionDurationMs = 8 * 60 * 60 * 1000;
const screens = [
  "home",
  "library",
  "newGame",
  "fallout4Campaign",
  "load",
  "dice",
  "chat",
  "support",
  "settings",
  "admin",
  "adminSettings",
  "adminSupport",
  "adminGames",
  "adminGenerator",
  "adminMaps",
  "adminUsers",
  "adminNotifications",
  "adminNews",
  "rules",
  "files",
  "content",
  "profile",
  "jsonEditor",
] as const satisfies readonly Screen[];
const Fallout4CampaignScreen = lazy(() =>
  import("./screens/Fallout4CampaignScreen").then((module) => ({ default: module.Fallout4CampaignScreen }))
);
const bundledGameJsonFiles = loadBundledGameJsonFiles();
const bundledUsers = loadBundledUserProfiles();

function upsertHistoryEntry(history: GameHistoryEntry[], entry: GameHistoryEntry) {
  const exists = history.some((item) => item.gameId === entry.gameId);
  if (!exists) return [entry, ...history];
  return history.map((item) => (item.gameId === entry.gameId ? { ...item, ...entry } : item));
}

function enforceFixedUserRole(profile: PlayerProfile) {
  if (profile.id === "operador-local" || profile.id === "invitado-local") {
    return { ...profile, role: "user" as const };
  }
  return profile;
}

function isScreen(value: string): value is Screen {
  return (screens as readonly string[]).includes(value);
}

function isSessionFresh(profile: PlayerProfile) {
  if (!profile.signedIn) return false;
  const sessionDate = profile.lastActivityAt ?? profile.lastLoginAt;
  if (!sessionDate) return false;
  const sessionTime = new Date(sessionDate).getTime();
  return !Number.isNaN(sessionTime) && Date.now() - sessionTime < sessionDurationMs;
}

function restoreSession(profile: PlayerProfile) {
  const enforcedProfile = enforceFixedUserRole(profile);
  return isSessionFresh(enforcedProfile) ? enforcedProfile : { ...enforcedProfile, signedIn: false };
}

function loadSessionScreen() {
  try {
    const stored = window.localStorage.getItem(sessionScreenKey);
    return stored && isScreen(stored) ? stored : "home";
  } catch {
    return "home";
  }
}

function loadBackendSession(): PlatformSession | undefined {
  try {
    const raw = window.localStorage.getItem(backendSessionKey);
    return raw ? (JSON.parse(raw) as PlatformSession) : undefined;
  } catch {
    return undefined;
  }
}

function persistBackendSession(session?: PlatformSession) {
  try {
    if (session) window.localStorage.setItem(backendSessionKey, JSON.stringify(session));
    else window.localStorage.removeItem(backendSessionKey);
  } catch {
    // Local storage can be unavailable in some native shells.
  }
}

function sanitizeScreenForProfile(nextScreen: Screen, profile: PlayerProfile) {
  if (isAdminScreen(nextScreen) && profile.role !== "admin") return "home";
  return nextScreen;
}

function isAdminScreen(screen: Screen) {
  return (adminScreens as readonly string[]).includes(screen);
}

function adminModuleForScreen(screen: Screen) {
  if (screen === "adminGames") return "games";
  if (screen === "adminGenerator") return "generator";
  if (screen === "adminMaps") return "maps";
  if (screen === "adminUsers") return "users";
  if (screen === "adminNotifications") return "notifications";
  if (screen === "adminNews") return "news";
  return "overview";
}

function loadDisabledGameIds() {
  try {
    const raw = window.localStorage.getItem(disabledGamesKey);
    return raw ? (JSON.parse(raw) as string[]) : bundledGames.filter((game) => game.enabled === false).map((game) => game.id);
  } catch {
    return bundledGames.filter((game) => game.enabled === false).map((game) => game.id);
  }
}

function applyDisabledGames(games: GameConfig[], disabledIds: string[]) {
  return games.map((game) => ({ ...game, enabled: disabledIds.includes(game.id) ? false : game.enabled ?? true }));
}

function toPlatformMapDocument(game: GameConfig, map: GameMap) {
  return {
    id: map.id,
    gameId: game.id,
    name: map.name,
    width: map.width,
    height: map.height,
    tileSize: map.tileSize ?? 48,
    image: map.background,
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: "terrain",
        name: "Terreno",
        visible: true,
        opacity: map.terrainOpacity ?? 1,
        tiles: Array.from({ length: map.height }, (_, y) =>
          Array.from({ length: map.width }, (_, x) => map.tiles?.find((tile) => tile.x === x && tile.y === y)?.terrain ?? "plain")
        ),
      },
      {
        id: "markers",
        name: "Marcadores",
        visible: true,
        opacity: map.markerScale ?? 1,
        markers: map.markers ?? [],
      },
    ],
  };
}

function toLightweightGameConfig(game: GameConfig) {
  return normalizeGameConfig({ ...game, maps: [] });
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => loadSessionScreen());
  const [disabledGameIds, setDisabledGameIds] = useState<string[]>(() => loadDisabledGameIds());
  const [games, setGames] = useState<GameConfig[]>(() => applyDisabledGames(bundledGames, loadDisabledGameIds()));
  const [gameJsonFiles, setGameJsonFiles] = useState<GameJsonFile[]>(bundledGameJsonFiles);
  const [profile, setProfile] = useState<PlayerProfile>(() => restoreSession(loadProfile(bundledGames)));
  const [users, setUsers] = useState<PlayerProfile[]>(() => bundledUsers.map((user) => normalizeProfile(user, bundledGames)));
  const [appMetadata, setAppMetadata] = useState(() => loadAppMetadata());
  const [platformSession, setPlatformSession] = useState<PlatformSession | undefined>();
  const [activeAudioManifest, setActiveAudioManifest] = useState<AudioManifest>(seedAudioManifest);
  const [storageReady, setStorageReady] = useState(false);
  const hasHydratedStorage = useRef(false);
  const hasHydratedBackend = useRef(false);
  const hasRefreshedSession = useRef(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const lastActivityScreen = useRef(screen);

  const visibleGames = profile.role === "admin" ? games : games.filter((game) => !disabledGameIds.includes(game.id));
  const platformRepository = useMemo(() => createPlatformRepository(appMetadata, platformSession?.id), [appMetadata.cloud, platformSession?.id]);
  const activeGame = visibleGames.find((game) => game.id === profile.activeGameId) ?? visibleGames[0] ?? games[0];
  const activeGameSaves = getGameSaves(profile, activeGame.id);
  const activeSave = getActiveSave(profile, activeGame.id);
  const activeCampaign = getActiveCampaign(activeGame, profile);

  const recommendedGames = useMemo(() => {
    const pool = visibleGames.filter((game) => game.id !== activeGame.id);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [activeGame.id, visibleGames]);
  const visibleNews = useMemo(
    () =>
      appMetadata.news
        .filter((entry) => (entry.status ?? "published") === "published")
        .filter((entry) => new Date(entry.publishedAt).getTime() <= Date.now())
        .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()),
    [appMetadata.news]
  );
  useEffect(() => {
    document.documentElement.lang = profile.settings.language;
    document.documentElement.dataset.theme = profile.settings.theme;
    document.documentElement.dataset.hud = profile.settings.hudColor;
    setMusicVolume(profile.settings.volumes.music * profile.settings.volumes.master);
  }, [profile]);

  useEffect(() => {
    if (hasHydratedStorage.current) return;
    hasHydratedStorage.current = true;

    Promise.all([loadNativeProfile(), loadNativeMetadata(), loadPersistentUsers()])
      .then(([nativeProfile, nativeMetadata, persistedUsers]) => {
        const normalizedUsers = [...persistedUsers, ...bundledUsers]
          .map((user) => enforceFixedUserRole(normalizeProfile(user, bundledGames)))
          .filter((user, index, array) => array.findIndex((item) => item.id === user.id) === index);
        const normalizedProfile = nativeProfile ? normalizeProfile(nativeProfile, bundledGames) : undefined;
        if (normalizedUsers.length > 0) {
          setUsers(normalizedUsers);
        } else if (normalizedProfile) {
          setUsers([normalizedProfile]);
        }
        if (normalizedProfile) setProfile(restoreSession(normalizedProfile));
        if (nativeMetadata) setAppMetadata(normalizeMetadata(nativeMetadata));
      })
      .finally(() => setStorageReady(true));
  }, []);

  useEffect(() => {
    if (!storageReady || hasHydratedBackend.current) return;
    hasHydratedBackend.current = true;
    let active = true;
    Promise.all([
      platformRepository.users.list(),
      platformRepository.games.list(),
      platformRepository.content.metadata(),
    ])
      .then(([backendUsers, backendGames, backendMetadata]) => {
        if (!active) return;
        if (backendUsers.length) {
          setUsers(backendUsers.map((user) => enforceFixedUserRole(normalizeProfile(user, bundledGames))));
        }
        if (backendGames.length) {
          setGames(applyDisabledGames(backendGames.map((game) => normalizeGameConfig(game)), disabledGameIds));
        }
        setAppMetadata(normalizeMetadata(backendMetadata));
      })
      .catch(() => {
        // Backend local opcional: la app conserva fallback local si no esta levantado.
      });
    return () => {
      active = false;
    };
  }, [disabledGameIds, platformRepository, storageReady]);

  useEffect(() => {
    setScreen((currentScreen) => sanitizeScreenForProfile(currentScreen, profile));
  }, [profile.role]);

  useEffect(() => {
    if (!storageReady) return;
    void savePersistentProfile(profile);
    setUsers((currentUsers) => {
      const normalizedProfile = enforceFixedUserRole(normalizeProfile(profile, bundledGames));
      const existingIndex = currentUsers.findIndex((user) => user.id === normalizedProfile.id);
      if (existingIndex < 0) return [normalizedProfile, ...currentUsers];
      return currentUsers.map((user, index) => (index === existingIndex ? normalizedProfile : user));
    });
  }, [profile, storageReady]);

  useEffect(() => {
    if (!storageReady || !profile.signedIn) return;
    try {
      window.localStorage.setItem(sessionScreenKey, sanitizeScreenForProfile(screen, profile));
    } catch {
      // Local storage can be unavailable in some native shells.
    }
  }, [profile, screen, storageReady]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [screen]);

  useEffect(() => {
    if (!storageReady || hasRefreshedSession.current) return;
    hasRefreshedSession.current = true;
    const storedSession = platformSession ?? loadBackendSession();
    if (!storedSession?.id) {
      if (profile.signedIn) setProfile((current) => ({ ...current, lastActivityAt: new Date().toISOString() }));
      return;
    }
    platformRepository.auth.refreshSession(storedSession.id)
      .then((refreshedSession) => {
        const refreshedUser = users.find((user) => user.id === refreshedSession.userId);
        setPlatformSession(refreshedSession);
        persistBackendSession(refreshedSession);
        setProfile((current) => ({
          ...(refreshedUser ? normalizeProfile(refreshedUser, bundledGames) : current),
          signedIn: true,
          lastActivityAt: refreshedSession.lastActivityAt,
        }));
      })
      .catch(() => {
        persistBackendSession(undefined);
        setPlatformSession(undefined);
        setProfile((current) => ({ ...current, signedIn: false }));
      });
  }, [platformRepository, platformSession, profile.signedIn, storageReady, users]);

  useEffect(() => {
    if (!profile.signedIn) return;
    const interval = window.setInterval(() => {
      setProfile((current) => (isSessionFresh(current) ? current : { ...current, signedIn: false }));
    }, 60000);
    return () => window.clearInterval(interval);
  }, [profile.signedIn]);

  useEffect(() => {
    if (!storageReady || !profile.signedIn || lastActivityScreen.current === screen) return;
    lastActivityScreen.current = screen;
    setProfile((current) => ({ ...current, lastActivityAt: new Date().toISOString() }));
  }, [profile.signedIn, screen, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    void savePersistentMetadata(appMetadata);
  }, [appMetadata, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    void savePersistentUsers(users, profile.id);
  }, [profile.id, storageReady, users]);

  useEffect(() => {
    let active = true;
    loadGameAudioManifest(activeGame).then((manifest) => {
      if (active) setActiveAudioManifest(manifest);
    });
    return () => {
      active = false;
    };
  }, [activeGame]);

  useEffect(() => {
    if (!profile.signedIn) {
      playTrack(loginFallout4MainTheme, "background");
      return;
    }

    if (!profile.settings.audioEnabled) {
      stopAudio();
      return;
    }

    const track = activeAudioManifest.tracks.background?.find(
      (item) => item.id === profile.settings.tracks.background
    );
    playTrack(track?.path, "background");
  }, [activeAudioManifest, profile.settings.audioEnabled, profile.settings.tracks.background, profile.signedIn]);

  useEffect(() => {
    if (screen !== "fallout4Campaign" || !activeSave) return;
    const interval = window.setInterval(() => {
      setProfile((current) => ({
        ...current,
        saves: current.saves.map((save) => {
          if (save.saveId !== activeSave.saveId) return save;
          const playTimeHours = Number(((save.playTimeHours ?? 0) + 1 / 60).toFixed(2));
          return {
            ...save,
            playTimeHours,
            daysElapsed: Math.floor(playTimeHours / 24),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    }, 60000);
    return () => window.clearInterval(interval);
  }, [activeSave, screen]);

  function updateContent(category: "dlc" | "features" | "extras", itemId: string) {
    setGames((currentGames) =>
      currentGames.map((game) => {
        if (game.id !== activeGame.id) return game;
        return {
          ...game,
          content: {
            ...game.content,
            [category]: game.content[category].map((item) =>
              item.id === itemId ? { ...item, enabled: !item.enabled } : item
            ),
          },
        };
      })
    );
  }

  function selectGame(gameId: string, nextScreen: Screen = "newGame") {
    if (profile.role !== "admin" && disabledGameIds.includes(gameId)) return;
    const now = new Date().toISOString();
    try {
      window.localStorage.setItem("rpg-platform.last-game-id", gameId);
    } catch {
      // Local storage can be unavailable in some native shells.
    }
    setProfile((current) => ({
      ...current,
      lastActivityAt: now,
      activeGameId: gameId,
      history: upsertHistoryEntry(current.history, {
        gameId,
        lastPlayedAt: now,
        sessions: 0,
      }),
    }));
    trackActivity(`Juego activo: ${games.find((game) => game.id === gameId)?.name ?? gameId}`);
    setScreen(nextScreen);
  }

  function updateSettings(settings: UserSettings) {
    setProfile((current) => ({ ...current, settings }));
  }

  function trackActivity(label: string) {
    setAppMetadata((current) => ({
      ...current,
      recentActivity: [createActivity(label), ...current.recentActivity].slice(0, 20),
    }));
  }

  function trackAudit(action: string, module: Parameters<typeof createAuditEntry>[0]["module"], actorId: string, targetId?: string, metadata?: Record<string, string | number | boolean | undefined>) {
    setAppMetadata((current) => ({
      ...current,
      auditLog: [
        createAuditEntry({ action, module, actorId, targetId, metadata }),
        ...(current.auditLog ?? []),
      ].slice(0, 200),
    }));
  }

  function registerUser(account: { email: string; username: string; password?: string; passwordHash?: string; role?: "user" | "admin" }) {
    const now = new Date().toISOString();
    const id = `user_${account.username.toLowerCase().replace(/[^a-z0-9_-]+/g, "_")}_${Date.now()}`;
    const newProfile = normalizeProfile(
      {
        ...createDefaultProfile(bundledGames),
        id,
        name: account.username,
        username: account.username,
        role: account.role ?? "user",
        email: account.email,
        password: account.passwordHash ? "" : account.password ?? "",
        passwordHash: account.passwordHash,
        passwordUpdatedAt: account.passwordHash ? now : undefined,
        basePath: `/users/${id}`,
        profilePath: `/users/${id}/profile.json`,
        signedIn: true,
        lastLoginAt: now,
        lastActivityAt: now,
      },
      bundledGames
    );

    setUsers((currentUsers) => [newProfile, ...currentUsers]);
    setProfile(newProfile);
    setScreen("home");
    void platformRepository.users.save(newProfile).catch(() => undefined);
    trackAudit("auth.login", "auth", newProfile.id, newProfile.id, { registered: true });
  }

  async function loginUser(credentials: { usernameOrEmail: string; password: string; remember: boolean }) {
    try {
      const result = await platformRepository.auth.login(credentials);
      setPlatformSession(result.session);
      persistBackendSession(result.session);
      setUsers((currentUsers) => [result.profile, ...currentUsers.filter((user) => user.id !== result.profile.id)]);
      return result.profile;
    } catch {
      return undefined;
    }
  }

  async function requestPasswordReset(usernameOrEmail: string) {
    await platformRepository.auth.requestPasswordReset(usernameOrEmail).catch(() => undefined);
  }

  function accessUser(nextProfile: PlayerProfile) {
    const enforcedProfile = enforceFixedUserRole(nextProfile);
    setProfile(enforcedProfile);
    setScreen(enforcedProfile.role === "admin" ? "admin" : "home");
    void platformRepository.users.save(enforcedProfile).catch(() => undefined);
    trackAudit("auth.login", "auth", enforcedProfile.id, enforcedProfile.id, { role: enforcedProfile.role ?? "user" });
  }

  function loadSave(saveId: string) {
    const save = profile.saves.find((item) => item.saveId === saveId);
    if (!save) return;
    const now = new Date().toISOString();
    const saveGame = games.find((game) => game.id === save.gameId) ?? activeGame;
    let pendingSaveDocument: ReturnType<typeof createSaveGameDocument> | undefined;

    setProfile((current) => ({
      ...current,
      lastActivityAt: now,
      activeGameId: save.gameId,
      saves: current.saves.map((item) => {
        if (item.saveId !== saveId) return item;
        const updatedSave = {
          ...item,
          sessions: (item.sessions ?? 0) + 1,
          lastLoadedAt: now,
          updatedAt: now,
        };
        pendingSaveDocument = createSaveGameDocument({ game: saveGame, profile: current, save: updatedSave });
        return updatedSave;
      }),
      history: upsertHistoryEntry(current.history, {
        gameId: save.gameId,
        sessions: (current.history.find((entry) => entry.gameId === save.gameId)?.sessions ?? 0) + 1,
        activeSaveId: save.saveId,
        activeCampaignId: save.campaignId,
        lastPlayedAt: now,
      }),
    }));
    if (pendingSaveDocument) void savePersistentGameDocument(pendingSaveDocument);
    void platformRepository.saves.save({
      ...save,
      sessions: (save.sessions ?? 0) + 1,
      lastLoadedAt: now,
      updatedAt: now,
    }).catch(() => undefined);
    trackActivity(`Partida cargada: ${save.name}`);
    setScreen(save.gameId === "fallout4" && save.campaignId === "sanctuary_commonwealth" ? "fallout4Campaign" : "home");
  }

  function persistActiveSaveProgress(patch: Partial<PlayerSave>) {
    const now = new Date().toISOString();
    let pendingSaveDocument: ReturnType<typeof createSaveGameDocument> | undefined;

    setProfile((current) => {
      const currentSave = getActiveSave(current, activeGame.id);
      if (!currentSave) return current;

      const updatedSave = {
        ...currentSave,
        ...patch,
        updatedAt: now,
      };

      pendingSaveDocument = createSaveGameDocument({ game: activeGame, profile: current, save: updatedSave });

      return {
        ...current,
        lastActivityAt: now,
        saves: current.saves.map((save) => (save.saveId === currentSave.saveId ? updatedSave : save)),
        history: upsertHistoryEntry(current.history, {
          gameId: updatedSave.gameId,
          sessions: current.history.find((entry) => entry.gameId === updatedSave.gameId)?.sessions ?? 0,
          activeCampaignId: updatedSave.campaignId,
          activeSaveId: updatedSave.saveId,
          lastPlayedAt: now,
        }),
      };
    });

    if (pendingSaveDocument) void savePersistentGameDocument(pendingSaveDocument);
    const currentSave = getActiveSave(profile, activeGame.id);
    if (currentSave) void platformRepository.saves.save({ ...currentSave, ...patch, updatedAt: now }).catch(() => undefined);
  }

  function continueGame() {
    if (activeSave) loadSave(activeSave.saveId);
  }

  function signOut() {
    if (platformSession?.id) void platformRepository.auth.logout(platformSession.id).catch(() => undefined);
    setPlatformSession(undefined);
    persistBackendSession(undefined);
    setProfile((current) => ({ ...current, signedIn: false, lastActivityAt: new Date().toISOString() }));
    try {
      window.localStorage.removeItem(sessionScreenKey);
    } catch {
      // Local storage can be unavailable in some native shells.
    }
    setScreen("home");
    trackActivity("Sesion cerrada");
    trackAudit("auth.logout", "auth", profile.id, profile.id);
  }

  function createNewGame() {
    const id = `custom_${Date.now()}`;
    const newGame: GameConfig = {
      id,
      name: "Nuevo juego",
      short: "NEW",
      description: "Configura la descripcion de tu nuevo modulo RPG.",
      tags: ["custom"],
      enabled: true,
      templateFuture: true,
      campaigns: [
        {
          id: "campaign_intro",
          title: "Campaña inicial",
          implemented: false,
          description: "Define la primera campaña de este juego.",
        },
      ],
      content: {
        dlc: [],
        features: [],
        extras: [],
      },
      configPath: `public/games/${id}/game.config.json`,
    };

    setGames((currentGames) => [newGame, ...currentGames]);
    setProfile((current) => ({
      ...current,
      activeGameId: id,
      history: [
        {
          gameId: id,
          lastPlayedAt: new Date().toISOString(),
          sessions: 0,
          activeCampaignId: "campaign_intro",
        },
        ...current.history,
      ],
    }));
    trackActivity("Nuevo juego creado: Nuevo juego");
    setScreen("jsonEditor");
  }

  function updateGame(updatedGame: GameConfig) {
    const previousId = games.some((game) => game.id === updatedGame.id) ? updatedGame.id : activeGame.id;
    setGames((currentGames) =>
      currentGames.map((game) => (game.id === previousId ? normalizeGameConfig(updatedGame) : game))
    );
    if (updatedGame.id !== previousId) {
      setProfile((current) => ({
        ...current,
        activeGameId: updatedGame.id,
        history: current.history.map((entry) =>
          entry.gameId === previousId ? { ...entry, gameId: updatedGame.id } : entry
        ),
        saves: current.saves.map((save) =>
          save.gameId === previousId ? { ...save, gameId: updatedGame.id } : save
        ),
      }));
    }
    trackActivity(`Config admin actualizada: ${updatedGame.name}`);
    void platformRepository.games.save(toLightweightGameConfig(updatedGame)).catch(() => undefined);
    trackAudit("admin.game.update", "games", profile.id, updatedGame.id, { name: updatedGame.name });
  }

  function updateGames(nextGames: GameConfig[]) {
    const nextDisabledIds = nextGames.filter((game) => game.enabled === false).map((game) => game.id);
    setDisabledGameIds(nextDisabledIds);
    try {
      window.localStorage.setItem(disabledGamesKey, JSON.stringify(nextDisabledIds));
    } catch {
      // Local storage can be unavailable in restricted webviews.
    }
    setGames(applyDisabledGames(nextGames.map((game) => normalizeGameConfig(game)), nextDisabledIds));
    trackActivity("Gestor de juegos actualizado");
    nextGames.forEach((game) => {
      void platformRepository.games.save(toLightweightGameConfig(game)).catch(() => undefined);
    });
    trackAudit("admin.game.update", "games", profile.id, "library", { total: nextGames.length });
  }

  function persistMap(game: GameConfig, map: GameMap) {
    void platformRepository.maps.save(toPlatformMapDocument(game, map)).catch(() => undefined);
    void platformRepository.playable.save(game.id, "locationMaps", map.id, {
      name: map.name,
      width: map.width,
      height: map.height,
      tileSize: map.tileSize ?? 48,
      background: map.background,
      backgroundMode: map.backgroundMode,
      backgroundSourceName: map.backgroundSourceName,
      gridOpacity: map.gridOpacity,
      terrainOpacity: map.terrainOpacity,
      markerScale: map.markerScale,
      nodes: map.nodes,
      markers: map.markers,
    }).catch(() => undefined);
    trackActivity(`Mapa guardado: ${map.name}`);
    trackAudit("admin.map.update", "maps", profile.id, map.id, { gameId: game.id });
  }

  function updateUsers(nextUsers: PlayerProfile[]) {
    const normalizedUsers = nextUsers.map((user) => enforceFixedUserRole(normalizeProfile(user, games)));
    setUsers(normalizedUsers);
    const activeUser = normalizedUsers.find((user) => user.id === profile.id);
    if (activeUser) setProfile((current) => ({ ...activeUser, signedIn: current.signedIn }));
    trackActivity("Usuarios y accesos actualizados");
    normalizedUsers.forEach((user) => {
      void platformRepository.users.save(user).catch(() => undefined);
    });
    trackAudit("admin.user.update", "users", profile.id, "users", { total: normalizedUsers.length });
  }

  function updateNews(news: AppNewsEntry[]) {
    setAppMetadata((current) => ({
      ...current,
      news,
    }));
    trackActivity("Noticias actualizadas");
    void platformRepository.content.saveNews(news).catch(() => undefined);
    trackAudit("admin.news.update", "news", profile.id, "news", { total: news.length });
  }

  function updateNotifications(notifications: AppNotificationEntry[]) {
    setAppMetadata((current) => ({
      ...current,
      notifications,
    }));
    trackActivity("Notificaciones actualizadas");
    void platformRepository.content.saveNotifications(notifications).catch(() => undefined);
    trackAudit("admin.notification.update", "notifications", profile.id, "notifications", { total: notifications.length });
  }

  function updateSupportTickets(supportTickets: AppMetadata["supportTickets"]) {
    setAppMetadata((current) => ({
      ...current,
      supportTickets,
    }));
    trackActivity("Soporte tecnico actualizado");
    supportTickets.forEach((ticket) => {
      void platformRepository.support.saveTicket(ticket).catch(() => undefined);
    });
    trackAudit("support.ticket.update", "support", profile.id, "support", { total: supportTickets.length });
  }

  function updatePlatformMetadata(patch: Partial<AppMetadata>) {
    setAppMetadata((current) => ({
      ...current,
      ...patch,
    }));
    trackActivity("Configuracion de plataforma actualizada");
    void platformRepository.content.saveMetadata({ ...appMetadata, ...patch }).catch(() => undefined);
    trackAudit("admin.settings.update", "settings", profile.id, "platform");
  }

  if (!profile.signedIn) {
    return (
      <div className={`crt-shell theme-${profile.settings.theme} hud-${profile.settings.hudColor}`}>
        <div className="animated-bg" />
        <AuthScreen
          profile={profile}
          users={users}
          games={games}
          news={visibleNews}
          platformName={appMetadata.platformName}
          appVersion={appMetadata.version}
          releaseChannel={appMetadata.releaseChannel}
          onAccess={accessUser}
          onRegister={registerUser}
          onLogin={loginUser}
          onPasswordReset={requestPasswordReset}
        />
      </div>
    );
  }

  return (
    <div className={`crt-shell theme-${profile.settings.theme} hud-${profile.settings.hudColor}`}>
      <div className="animated-bg" />
      <div className={`app-frame screen-${screen}`}>
        <TopBar
          profile={profile}
          platformName={appMetadata.platformName}
          appVersion={appMetadata.version}
          assetOverrides={profile.settings.assetOverrides}
          notifications={appMetadata.notifications}
          onProfile={() => setScreen("profile")}
          onSettings={() => setScreen(profile.role === "admin" ? "adminSettings" : "settings")}
        />

        <div className="app-body">
          <Sidebar
            active={screen}
            appVersion={appMetadata.version}
            platformName={appMetadata.platformName}
            releaseChannel={appMetadata.releaseChannel}
            assetOverrides={profile.settings.assetOverrides}
            isAdmin={profile.role === "admin"}
            language={profile.settings.language}
            onChange={setScreen}
            onExit={signOut}
          />

          <main className="app-main" ref={mainScrollRef}>
          {screen === "home" && (
            <HomeScreen
              game={activeGame}
              campaign={activeCampaign}
              save={activeSave}
              saves={activeGameSaves}
              recentActivity={appMetadata.recentActivity}
              news={visibleNews}
              recommended={recommendedGames}
              onContinue={continueGame}
              onDice={() => setScreen("dice")}
              onDetails={() => setScreen("content")}
              onSelectRecommended={(gameId) => selectGame(gameId, "content")}
            />
          )}

          {screen === "library" && (
            <LibraryScreen
              games={visibleGames}
              activeId={activeGame.id}
              onSelect={(gameId) => selectGame(gameId, "newGame")}
              onConfigure={(gameId) => selectGame(gameId, "content")}
              onCreateGame={createNewGame}
              onBack={() => setScreen("home")}
            />
          )}

          {screen === "content" && (
            <ContentScreen
              game={activeGame}
              platformRepository={platformRepository}
              canEditPlayable={profile.role === "admin"}
              onBack={() => setScreen("home")}
              onToggle={updateContent}
              onSetAll={(enabled) => {
                setGames((currentGames) =>
                  currentGames.map((game) =>
                    game.id === activeGame.id
                      ? {
                          ...game,
                          content: {
                            dlc: game.content.dlc.map((item) => ({ ...item, enabled })),
                            features: game.content.features.map((item) => ({ ...item, enabled })),
                            extras: game.content.extras.map((item) => ({ ...item, enabled })),
                          },
                        }
                      : game
                  )
                );
              }}
              onEditJson={() => setScreen("jsonEditor")}
            />
          )}

          {screen === "newGame" && (
            <NewGameScreen
              game={activeGame}
              characters={seedCharacters}
              onContent={() => setScreen("content")}
              onBack={() => setScreen("home")}
              onStart={(characterName, attributes, options) => {
                const campaignId = activeCampaign?.id ?? activeGame.campaigns[0]?.id ?? "free_exploration";
                const now = new Date().toISOString();
                const saveId = `${activeGame.id}_${Date.now()}`;
                const storagePath = getSaveGamePath(activeGame.id, profile.id, saveId);
                const route = activeCampaign?.simulation?.route ?? [];
                let pendingSaveDocument: ReturnType<typeof createSaveGameDocument> | undefined;
                setProfile((current) => {
                  const newSave = {
                    saveId,
                    gameId: activeGame.id,
                    campaignId,
                    userId: current.id,
                    storagePath,
                    playerName: characterName,
                    name: `${characterName} - ${activeGame.name}`,
                    currentMission: activeCampaign?.title ?? "Explorando Yermo",
                    currentZone: route[0] ?? activeGame.name,
                    progressPercent: route.length ? Math.round(100 / route.length) : 0,
                    route,
                    visitedZones: route[0] ? [route[0]] : [activeGame.name],
                    currentStep: 0,
                    level: 1,
                    sessions: 0,
                    playTimeHours: 0,
                    playStartedAt: now,
                    lastLoadedAt: now,
                    daysElapsed: 0,
                    inGameDayStartedAt: now,
                    createdAt: now,
                    updatedAt: now,
                  };
                  pendingSaveDocument = createSaveGameDocument({ game: activeGame, profile: current, save: newSave, attributes });

                  return {
                    ...current,
                    activeGameId: activeGame.id,
                    saves: [newSave, ...current.saves],
                    history: upsertHistoryEntry(current.history, {
                      gameId: activeGame.id,
                      sessions: 0,
                      activeCampaignId: campaignId,
                      activeSaveId: saveId,
                      lastPlayedAt: now,
                    }),
                    lastActivityAt: now,
                    gameProfilesStarted: current.saves.length + 1,
                  };
                });
                if (pendingSaveDocument) void savePersistentGameDocument(pendingSaveDocument);
                if (pendingSaveDocument) void platformRepository.saves.save(pendingSaveDocument.save).catch(() => undefined);
                trackActivity(`Partida creada: ${characterName} - ${activeGame.name}`);
                setScreen(activeGame.id === "fallout4" && options?.mode === "guided" ? "fallout4Campaign" : "home");
              }}
            />
          )}

          {screen === "fallout4Campaign" && (
            <Suspense fallback={<section className="screen-panel"><div className="screen-heading"><h2>Cargando campana</h2><p>Preparando Fallout 4 textual.</p></div></section>}>
              <Fallout4CampaignScreen
                game={activeGame}
                save={activeSave}
                onBack={() => setScreen("home")}
                onDice={() => setScreen("dice")}
                onProgress={persistActiveSaveProgress}
              />
            </Suspense>
          )}

          {screen === "load" && (
            <LoadGameScreen
              game={activeGame}
              saves={activeGameSaves}
              activeSaveId={activeSave?.saveId}
              onLoad={loadSave}
            />
          )}

          {screen === "dice" && <DiceScreen game={activeGame} />}
          {screen === "chat" && (
            <ChatScreen
              profile={profile}
              isAdmin={profile.role === "admin"}
              defaultRelayUrl={appMetadata.chatRelayUrl}
              defaultRoom={appMetadata.chatRoom}
              onLoadMessages={(roomId, channelId) => platformRepository.chat.listMessages(roomId, channelId)}
              onSendMessage={(message) => platformRepository.chat.sendMessage(message)}
              onBack={() => setScreen("home")}
            />
          )}
          {(screen === "support" || (screen === "adminSupport" && profile.role === "admin")) && (
            <SupportScreen
              profile={profile}
              tickets={appMetadata.supportTickets}
              isAdmin={profile.role === "admin"}
              onChange={updateSupportTickets}
              onBack={() => setScreen(profile.role === "admin" ? "admin" : "home")}
            />
          )}
          {screen === "adminSettings" && profile.role === "admin" && (
            <AdminPlatformSettings
              metadata={appMetadata}
              onChange={updatePlatformMetadata}
              onBack={() => setScreen("admin")}
            />
          )}
          {screen === "settings" && (
            <SettingsScreen
              manifest={activeAudioManifest}
              settings={profile.settings}
              onChange={updateSettings}
              onBack={() => setScreen("home")}
            />
          )}
          {isAdminScreen(screen) && screen !== "adminSettings" && screen !== "adminSupport" && profile.role === "admin" && (
            <AdminScreen
              module={adminModuleForScreen(screen)}
              games={games}
              users={users}
              activeGameId={activeGame.id}
              activeUserId={profile.id}
              news={appMetadata.news}
              notifications={appMetadata.notifications}
              supportTickets={appMetadata.supportTickets}
              platformRepository={platformRepository}
              onSelectGame={(gameId) => selectGame(gameId, screen)}
              onUpdateGame={updateGame}
              onUpdateGames={updateGames}
              onPersistMap={persistMap}
              onAddGame={createNewGame}
              onUpdateUsers={updateUsers}
              onUpdateNews={updateNews}
              onUpdateNotifications={updateNotifications}
              onBack={() => setScreen("home")}
            />
          )}
          {isAdminScreen(screen) && profile.role !== "admin" && (
            <HomeScreen
              game={activeGame}
              campaign={activeCampaign}
              save={activeSave}
              saves={activeGameSaves}
              recentActivity={appMetadata.recentActivity}
              news={visibleNews}
              recommended={recommendedGames}
              onContinue={continueGame}
              onDice={() => setScreen("dice")}
              onDetails={() => setScreen("content")}
              onSelectRecommended={(gameId) => selectGame(gameId, "content")}
            />
          )}
          {screen === "rules" && <RulesScreen game={activeGame} onBack={() => setScreen("home")} />}
          {screen === "files" && (
            <FilesScreen
              games={games}
              activeGameId={activeGame.id}
              files={gameJsonFiles}
              onLoadGames={(loadedGames) => setGames(loadedGames.map((game) => normalizeGameConfig(game)))}
              onSelectGame={(gameId) => selectGame(gameId, "files")}
              onEditConfig={(gameId) => selectGame(gameId, "jsonEditor")}
              onUpdateFile={(path, raw) => {
                setGameJsonFiles((currentFiles) =>
                  currentFiles.map((file) => (file.path === path ? { ...file, raw } : file))
                );
                const diskPath = path.startsWith("/games/") ? `public${path}` : path;
                void writeText(diskPath, raw);
              }}
              canEdit={profile.role === "admin"}
            />
          )}
          {screen === "profile" && (
            <ProfileScreen
              profile={profile}
              games={games}
              onSave={setProfile}
              onBack={() => setScreen("home")}
            />
          )}
          {screen === "jsonEditor" && (
            <JsonEditorScreen
              game={activeGame}
              onChange={(updatedGame) => {
                const previousId = activeGame.id;
                setGames((currentGames) =>
                  currentGames.map((game) => (game.id === previousId ? updatedGame : game))
                );
                if (updatedGame.id !== previousId) {
                  setProfile((current) => ({
                    ...current,
                    activeGameId: updatedGame.id,
                    history: current.history.map((entry) =>
                      entry.gameId === previousId ? { ...entry, gameId: updatedGame.id } : entry
                    ),
                    saves: current.saves.map((save) =>
                      save.gameId === previousId ? { ...save, gameId: updatedGame.id } : save
                    ),
                  }));
                }
              }}
              onBack={() => setScreen("files")}
            />
          )}
          </main>
        </div>
      </div>
    </div>
  );
}
