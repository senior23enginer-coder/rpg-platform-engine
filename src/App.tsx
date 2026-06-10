import { useEffect, useMemo, useState } from "react";
import "./styles/app.css";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
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
import type { Screen } from "./screens/types";
import type { AudioManifest, GameConfig } from "./types/game";
import type { PlayerProfile, UserSettings } from "./types/profile";
import { seedCharacters, seedGames } from "./lib/seedLibrary";
import { soundLibrary } from "./lib/soundLibrary";
import {
  getActiveCampaign,
  getActiveSave,
  getGameSaves,
  loadProfile,
  saveProfile,
} from "./lib/playerProfile";
import { playTrack, setMusicVolume, stopAudio } from "./lib/audioEngine";

function manifestForGame(gameId: string, manifest: AudioManifest): AudioManifest {
  return {
    tracks: Object.fromEntries(
      Object.entries(manifest.tracks).map(([category, tracks]) => [
        category,
        tracks.map((track) => ({
          ...track,
          mode: "file" as const,
          path: track.path?.replace(/^\/sounds\//, `/games/${gameId}/audio/sounds/`),
        })),
      ])
    ),
  };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [games, setGames] = useState<GameConfig[]>(seedGames);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile(seedGames));

  const activeGame = games.find((game) => game.id === profile.activeGameId) ?? games[0];
  const activeGameSaves = getGameSaves(profile, activeGame.id);
  const activeSave = getActiveSave(profile, activeGame.id);
  const activeCampaign = getActiveCampaign(activeGame, profile);
  const activeAudioManifest = useMemo(
    () => manifestForGame(activeGame.id, soundLibrary),
    [activeGame.id]
  );

  const recommendedGames = useMemo(() => {
    const pool = games.filter((game) => game.id !== activeGame.id);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [activeGame.id, games]);

  useEffect(() => {
    saveProfile(profile);
    document.documentElement.dataset.theme = profile.settings.theme;
    document.documentElement.dataset.hud = profile.settings.hudColor;
    setMusicVolume(profile.settings.volumes.music * profile.settings.volumes.master);
  }, [profile]);

  useEffect(() => {
    if (!profile.settings.audioEnabled) {
      stopAudio();
      return;
    }

    const track = activeAudioManifest.tracks.background?.find(
      (item) => item.id === profile.settings.tracks.background
    );
    playTrack(track?.path, "background");
  }, [activeAudioManifest, profile.settings.audioEnabled, profile.settings.tracks.background]);

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
    setProfile((current) => ({
      ...current,
      activeGameId: gameId,
      history: current.history.map((entry) =>
        entry.gameId === gameId
          ? { ...entry, lastPlayedAt: new Date().toISOString(), sessions: entry.sessions + 1 }
          : entry
      ),
    }));
    setScreen(nextScreen);
  }

  function updateSettings(settings: UserSettings) {
    setProfile((current) => ({ ...current, settings }));
  }

  function loadSave(saveId: string) {
    const save = profile.saves.find((item) => item.saveId === saveId);
    if (!save) return;

    setProfile((current) => ({
      ...current,
      activeGameId: save.gameId,
      history: current.history.map((entry) =>
        entry.gameId === save.gameId
          ? {
              ...entry,
              activeSaveId: save.saveId,
              activeCampaignId: save.campaignId,
              lastPlayedAt: new Date().toISOString(),
              sessions: entry.sessions + 1,
            }
          : entry
      ),
    }));
    setScreen("home");
  }

  function continueGame() {
    if (activeGameSaves.length > 1) {
      setScreen("load");
      return;
    }

    if (activeSave) loadSave(activeSave.saveId);
    else setScreen("newGame");
  }

  function createNewGame() {
    const id = `custom_${Date.now()}`;
    const newGame: GameConfig = {
      id,
      name: "Nuevo juego",
      short: "NEW",
      description: "Configura la descripcion de tu nuevo modulo RPG.",
      tags: ["custom"],
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
    setScreen("jsonEditor");
  }

  return (
    <div className={`crt-shell theme-${profile.settings.theme} hud-${profile.settings.hudColor}`}>
      <div className="animated-bg" />
      <div className={`app-frame screen-${screen}`}>
          <TopBar
            profile={profile}
            onProfile={() => setScreen("profile")}
            onSettings={() => setScreen("settings")}
          />

        <div className="app-body">
          <Sidebar active={screen} onChange={setScreen} />

          <main className="app-main">
          {screen === "home" && (
            <HomeScreen
              game={activeGame}
              campaign={activeCampaign}
              save={activeSave}
              saves={activeGameSaves}
              recommended={recommendedGames}
              onContinue={continueGame}
              onDice={() => setScreen("dice")}
              onSelectRecommended={(gameId) => selectGame(gameId, "content")}
            />
          )}

          {screen === "library" && (
            <LibraryScreen
              games={games}
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
              onBack={() => setScreen("library")}
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
              onStart={(characterName, attributes) => {
                const campaignId = activeCampaign?.id ?? activeGame.campaigns[0]?.id ?? "free_exploration";
                const now = new Date().toISOString();
                const saveId = `${activeGame.id}_${Date.now()}`;
                const attributeLevel = Math.max(
                  1,
                  Math.round(Object.values(attributes).reduce((sum, value) => sum + Number(value || 0), 0) / 8)
                );
                setProfile((current) => ({
                  ...current,
                  activeGameId: activeGame.id,
                  saves: [
                    {
                      saveId,
                      gameId: activeGame.id,
                      campaignId,
                      name: `${characterName} - ${activeGame.name}`,
                      currentMission: activeCampaign?.title ?? "Explorando Yermo",
                      currentZone: activeGame.name,
                      level: attributeLevel,
                      updatedAt: now,
                    },
                    ...current.saves,
                  ],
                  history: current.history.map((entry) =>
                    entry.gameId === activeGame.id
                      ? {
                          ...entry,
                          activeCampaignId: campaignId,
                          activeSaveId: saveId,
                          lastPlayedAt: now,
                          sessions: entry.sessions + 1,
                        }
                      : entry
                  ),
                }));
                setScreen("home");
              }}
            />
          )}

          {screen === "load" && (
            <LoadGameScreen
              game={activeGame}
              saves={activeGameSaves}
              activeSaveId={activeSave?.saveId}
              onLoad={loadSave}
            />
          )}

          {screen === "dice" && <DiceScreen />}
          {screen === "settings" && (
            <SettingsScreen
              manifest={activeAudioManifest}
              settings={profile.settings}
              onChange={updateSettings}
              onBack={() => setScreen("home")}
            />
          )}
          {screen === "rules" && <RulesScreen onBack={() => setScreen("home")} />}
          {screen === "files" && (
            <FilesScreen
              onLoadGames={setGames}
              onEditConfig={() => setScreen("jsonEditor")}
            />
          )}
          {screen === "profile" && (
            <ProfileScreen
              profile={profile}
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
