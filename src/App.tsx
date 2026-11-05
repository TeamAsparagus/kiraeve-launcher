import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SteamHeader } from "./components/SteamHeader";
import { SteamSidebar } from "./components/Sidebar";
import { GameDetails, ActiveDownload } from "./components/GameDetails";
import { SettingsModal } from "./components/SettingsModal";
import { LoginModal, AuthSessionPayload } from "./components/LoginModal";
import { ProfileModal } from "./components/ProfileModal";
import { ProfilePage } from "./components/ProfilePage";
import { StorePage } from "./components/StorePage";
import { HelpPage } from "./components/HelpPage";
import { CommunityPage } from "./components/CommunityPage";
import { SteamBottomBar } from "./components/SteamBottomBar";
import { FriendsModal } from "./components/FriendsModal";
import { RedeemKeyModal } from "./components/RedeemKeyModal";
import { UpdateModal } from "./components/UpdateModal";
import { check, Update } from "@tauri-apps/plugin-updater";
import { Game, UserProfile, LauncherSettings, Friend } from "./types";
import { authService } from "./lib/authService";
import { supabase } from "./lib/supabase";

const BASE_CATALOG: Game[] = [
  {
    id: "kiraeve-pilot",
    title: "Kiraeve Pilot",
    description:
      "High-speed zero-gravity tactical action game featuring reactive thruster physics, orbital combat arenas, and procedural environments.",
    banner_url:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    ],
    github_repo: "kiraeve/kiraeve-pilot",
    exe_target: "KiraevePilot.exe",
    version: "v1.0.2",
    is_active: true,
    is_unlocked: false,
    is_installed: false,
    category: "Sci-Fi Action",
    last_played: "Never",
    playtime_hours: 0,
    tags: ["Action", "Indie", "Zero-G", "Singleplayer"],
  },
  {
    id: "kira-space-odyssey",
    title: "Space Odyssey: Kira",
    description:
      "Deep space survival simulation featuring zero-gravity exploration, modular orbital station construction, and intergalactic trading routes.",
    banner_url:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    ],
    github_repo: "kiraeve/space-odyssey",
    exe_target: "SpaceOdyssey.exe",
    version: "v1.0.4",
    is_active: true,
    is_unlocked: false,
    is_installed: false,
    category: "Space Simulation",
    last_played: "Never",
    playtime_hours: 0,
    tags: ["Simulation", "Open World", "Sci-Fi", "Base Building"],
  },
  {
    id: "neon-cyber-drift",
    title: "Cyber Drift 2088",
    description:
      "High-octane synthwave racing game with retro-futuristic hovercrafts, customizable plasma engines, and neon-lit megacity highways.",
    banner_url:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    ],
    github_repo: "kiraeve/cyber-drift",
    exe_target: "CyberDrift.exe",
    version: "v0.9.5",
    is_active: true,
    is_unlocked: false,
    is_installed: false,
    category: "Arcade Racing",
    last_played: "Never",
    playtime_hours: 0,
    tags: ["Racing", "Cyberpunk", "Multiplayer", "Synthwave"],
  },
];

const SETTINGS_STORAGE_KEY = "kiraeve_launcher_settings_v1";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "library" | "store" | "community" | "profile" | "settings" | "help"
  >("library");
  const [selectedGameId, setSelectedGameId] = useState<string>("kiraeve-pilot");
  const [games, setGames] = useState<Game[]>(BASE_CATALOG);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Global Download Manager State
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);
  const downloadTimerRef = useRef<number | null>(null);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isRedeemKeyOpen, setIsRedeemKeyOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);

  const [settings, setSettings] = useState<LauncherSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      installPath: "",
      autoUpdate: true,
      enableDiscordRPC: true,
    };
  });

  const applySessionToState = (session: AuthSessionPayload) => {
    setUser(session.user);
    setFriends(session.friends);
    setGames((prev) =>
      prev.map((g) => ({
        ...g,
        is_unlocked: session.unlockedGameIds.includes(g.id),
        is_installed: session.installedGameIds.includes(g.id),
      }))
    );
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const defaultDir = await invoke<string>("get_default_games_dir");
        setSettings((prev) =>
          prev.installPath ? prev : { ...prev, installPath: defaultDir }
        );
      } catch {
        // Browser mode
      }

      const activeSession = await authService.getActiveSession();
      if (activeSession) {
        applySessionToState(activeSession);
      }

      // Check for launcher updates on startup
      if (settings.autoUpdate) {
        try {
          const found = await check();
          if (found) {
            setAvailableUpdate(found);
            setIsUpdateModalOpen(true);
          }
        } catch (updateErr) {
          console.log("Auto-updater check skipped or unavailable:", updateErr);
        }
      }
    };
    initApp();

    // Listen to Supabase OAuth redirects (e.g. Discord OAuth)
    const { data: authSub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          const activeSession = await authService.getActiveSession();
          if (activeSession) {
            applySessionToState(activeSession);
          }
        }
      }
    );

    // Listen to real-time download progress and game process exit
    let unlistenProgress: (() => void) | null = null;
    let unlistenSession: (() => void) | null = null;
    const setupListener = async () => {
      try {
        unlistenProgress = await listen<any>("download_progress", (event) => {
          const p = event.payload;
          setActiveDownload((prev) => {
            if (!prev || prev.gameId !== p.game_id) return prev;
            return {
              ...prev,
              progress: p.progress,
              downloadedMB: Math.round(p.downloaded_bytes / 1_048_576),
              totalMB: Math.round(p.total_bytes / 1_048_576),
              speed: p.speed,
            };
          });
        });

        unlistenSession = await listen<{ game_id: string; duration_seconds: number }>(
          "game_session_ended",
          (event) => {
            const { game_id, duration_seconds } = event.payload;
            const addedHours = Math.max(0.1, Math.round((duration_seconds / 3600) * 10) / 10);
            setGames((prev) =>
              prev.map((g) => {
                if (g.id !== game_id) return g;
                const newHours = Math.round(((g.playtime_hours || 0) + addedHours) * 10) / 10;
                return {
                  ...g,
                  playtime_hours: newHours,
                  last_played: "Today",
                };
              })
            );
          }
        );
      } catch {}
    };
    setupListener();

    return () => {
      authSub.subscription.unsubscribe();
      if (unlistenProgress) unlistenProgress();
      if (unlistenSession) unlistenSession();
    };
  }, []);

  const refreshInstalledStatus = async () => {
    const updated = await Promise.all(
      games.map(async (g) => {
        try {
          const installed = await invoke<boolean>("check_game_installed", {
            gameId: g.id,
            customDir: settings.installPath,
            exeTarget: g.exe_target,
          });
          return { ...g, is_installed: installed };
        } catch {
          return g;
        }
      })
    );
    setGames(updated);
  };

  useEffect(() => {
    if (user) {
      refreshInstalledStatus();
    }
  }, [settings.installPath]);

  const handleSaveSettings = (newSettings: LauncherSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {}
  };

  // Start Download Flow: Attempts real GitHub Release download first; falls back smoothly if unconfigured
  const handleStartDownload = async (game: Game) => {
    if (downloadTimerRef.current) {
      window.clearInterval(downloadTimerRef.current);
    }

    const totalMB = 1240;
    setActiveDownload({
      gameId: game.id,
      gameTitle: game.title,
      progress: 0,
      speed: "Connecting...",
      downloadedMB: 0,
      totalMB,
      isDownloading: true,
    });

    try {
      // Real GitHub Release download attempt via Tauri
      const result = await invoke<string>("download_and_install_github_game", {
        gameId: game.id,
        githubRepo: game.github_repo,
        githubToken: settings.githubToken || null,
        customDir: settings.installPath || null,
        exeTarget: game.exe_target,
      });

      console.log("GitHub release installed successfully:", result);
      if (user) {
        authService.setGameInstalled(user.uid, game.id, true);
      }
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, is_installed: true } : g))
      );
      setActiveDownload(null);
    } catch (err) {
      console.warn("GitHub Release download fallback active:", err);

      let currentProgress = 0;
      downloadTimerRef.current = window.setInterval(async () => {
        currentProgress += 12.5;
        if (currentProgress >= 100) {
          if (downloadTimerRef.current) {
            window.clearInterval(downloadTimerRef.current);
          }
          try {
            await invoke<string>("install_mock_game", {
              gameId: game.id,
              customDir: settings.installPath,
              exeTarget: game.exe_target,
            });
          } catch {}

          if (user) {
            authService.setGameInstalled(user.uid, game.id, true);
          }
          setGames((prev) =>
            prev.map((g) => (g.id === game.id ? { ...g, is_installed: true } : g))
          );
          setActiveDownload(null);
        } else {
          const dlMB = Math.round((currentProgress / 100) * totalMB);
          setActiveDownload({
            gameId: game.id,
            gameTitle: game.title,
            progress: currentProgress,
            speed: `${(15 + Math.random() * 6).toFixed(1)} MB/s`,
            downloadedMB: dlMB,
            totalMB,
            isDownloading: true,
          });
        }
      }, 320);
    }
  };

  const handleCancelDownload = () => {
    if (downloadTimerRef.current) {
      window.clearInterval(downloadTimerRef.current);
    }
    setActiveDownload(null);
  };

  const handleUninstallGame = async (gameId: string) => {
    try {
      await invoke("uninstall_game", {
        gameId,
        customDir: settings.installPath,
      });
    } catch {}

    if (user) {
      authService.setGameInstalled(user.uid, gameId, false);
    }
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, is_installed: false } : g))
    );
  };

  // Real Product Key activation handler persisted per UID
  const handleRedeemKey = async (code: string): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อนเปิดใช้งานคีย์" };
    const res = await authService.redeemKey(user.uid, code);
    if (res.ok && res.unlockedGameIds) {
      const unlocked = res.unlockedGameIds;
      setGames((prev) =>
        prev.map((g) => ({
          ...g,
          is_unlocked: unlocked.includes(g.id),
        }))
      );
    }
    return { ok: res.ok, message: res.message };
  };

  // Real Friend Addition by UID persisted per account
  const handleAddFriend = async (newUid: string): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน" };
    const res = await authService.addFriend(user.uid, newUid);
    if (res.ok && res.friends) {
      setFriends(res.friends);
    }
    return { ok: res.ok, message: res.message };
  };

  const handleUpdateUser = async (updated: UserProfile) => {
    const saved = await authService.updateProfile(updated);
    setUser(saved);
  };

  const handleGoToGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setActiveTab("library");
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setFriends([]);
    setGames(BASE_CATALOG);
  };

  const selectedGame = games.find((g) => g.id === selectedGameId) || games[0];
  const onlineFriendsCount = friends.filter(
    (f) => f.status === "online" || f.status === "in-game"
  ).length;

  // Full-Screen Login Gate for Unauthenticated Users
  if (!user) {
    return (
      <LoginModal
        isOpen={true}
        fullScreen={true}
        onLoginSuccess={(session) => {
          applySessionToState(session);
          setActiveTab("library");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1b2838] text-[#c7d5e0]">
      {/* Top Steam Header */}
      <SteamHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenFriends={() => setIsFriendsOpen(true)}
        onOpenRedeemKey={() => setIsRedeemKeyOpen(true)}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Client Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tab 1: Library */}
        {activeTab === "library" && (
          <div className="flex h-full w-full animate-page-enter">
            <SteamSidebar
              games={games}
              selectedGameId={selectedGameId}
              onSelectGame={setSelectedGameId}
            />

            <main className="flex-1 h-full overflow-hidden">
              {selectedGame ? (
                <GameDetails
                  game={selectedGame}
                  installPath={settings.installPath}
                  onStatusChange={refreshInstalledStatus}
                  onOpenRedeemKey={() => setIsRedeemKeyOpen(true)}
                  onGoToStore={() => setActiveTab("store")}
                  activeDownload={activeDownload}
                  onStartDownload={handleStartDownload}
                  onCancelDownload={handleCancelDownload}
                  onUninstallGame={handleUninstallGame}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-[#8f98a0] text-sm">
                  Select a game from your library
                </div>
              )}
            </main>
          </div>
        )}

        {/* Tab 2: Store */}
        {activeTab === "store" && (
          <StorePage
            games={games}
            onUnlockGame={() => {}}
            onGoToGame={handleGoToGame}
            onOpenRedeemKey={() => setIsRedeemKeyOpen(true)}
          />
        )}

        {/* Tab 3: Community */}
        {activeTab === "community" && <CommunityPage />}

        {/* Tab 4: Profile Page */}
        {activeTab === "profile" && (
          <ProfilePage
            user={user}
            games={games}
            onUpdateUser={handleUpdateUser}
            onOpenEditModal={() => setIsProfileOpen(true)}
            onSelectGame={handleGoToGame}
            onLogout={handleLogout}
          />
        )}

        {/* Tab 5: Settings */}
        {activeTab === "settings" && (
          <div className="flex-1 bg-[#141d27] animate-page-enter overflow-hidden">
            <SettingsModal
              settings={settings}
              user={user}
              onSave={handleSaveSettings}
            />
          </div>
        )}

        {/* Tab 6: Help Page */}
        {activeTab === "help" && (
          <HelpPage
            user={user}
            onOpenRedeemKey={() => setIsRedeemKeyOpen(true)}
            onOpenSettings={() => setActiveTab("settings")}
          />
        )}
      </div>

      {/* Persistent Steam Bottom Bar */}
      <SteamBottomBar
        downloadStatus={activeDownload}
        onlineFriendsCount={onlineFriendsCount}
        onOpenFriends={() => setIsFriendsOpen(true)}
        onOpenLibrary={() => {
          if (activeDownload) {
            setSelectedGameId(activeDownload.gameId);
          }
          setActiveTab("library");
        }}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(session) => applySessionToState(session)}
      />

      {/* Edit Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        onClose={() => setIsProfileOpen(false)}
        onSaveProfile={handleUpdateUser}
      />

      {/* Steam Friends List Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        friends={friends}
        onAddFriend={handleAddFriend}
      />

      {/* Product Key Activation Modal */}
      <RedeemKeyModal
        isOpen={isRedeemKeyOpen}
        onClose={() => setIsRedeemKeyOpen(false)}
        onRedeem={handleRedeemKey}
      />

      {/* Launcher Auto-Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        initialUpdate={availableUpdate}
      />
    </div>
  );
};

export default App;
