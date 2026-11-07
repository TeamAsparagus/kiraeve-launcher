import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ShoppingBag } from "lucide-react";
import { SteamHeader } from "./components/SteamHeader";
import { SteamSidebar } from "./components/Sidebar";
import { GameDetails, ActiveDownload } from "./components/GameDetails";
import { SettingsModal } from "./components/SettingsModal";
import { LoginModal, AuthSessionPayload } from "./components/LoginModal";
import { ProfileModal } from "./components/ProfileModal";
import { ProfilePage } from "./components/ProfilePage";
import { StorePage } from "./components/StorePage";
import { CommunityPage } from "./components/CommunityPage";
import { SteamBottomBar } from "./components/SteamBottomBar";
import { FriendsModal } from "./components/FriendsModal";
import { RedeemKeyModal } from "./components/RedeemKeyModal";
import { UpdateModal } from "./components/UpdateModal";
import { check, Update } from "@tauri-apps/plugin-updater";
import { Game, UserProfile, LauncherSettings, Friend } from "./types";
import { authService } from "./lib/authService";
import { supabase } from "./lib/supabase";
import { openExternal } from "./lib/openExternal";
import { resizeForLogin, resizeForMainApp } from "./lib/windowManager";

const BASE_CATALOG: Game[] = [
  {
    id: "anime-battle",
    title: "Anime Battle",
    description:
      "Action-packed 3D anime battle arena featuring signature martial skills, destructive ultimate combos, and fluid multiplayer combat.",
    banner_url:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1400&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
    ],
    github_repo: "BonikiWazari/AnimeBattle",
    manifest_url: "https://pub-62352b30a9014afa94bda00163ab4d79.r2.dev/games/anime-battle/manifest.json",
    exe_target: "AnimeBattle.exe",
    version: "v1.0.0",
    is_active: true,
    is_unlocked: false,
    is_installed: false,
    category: "Anime Action",
    last_played: "Never",
    playtime_hours: 0,
    tags: ["Anime", "Action", "Fighting", "3D Arena", "Multiplayer"],
  },
];

const SETTINGS_STORAGE_KEY = "kiraeve_launcher_settings_v1";
const PLAYTIME_STORAGE_KEY = "kiraeve_playtime_v1";

function loadSavedPlaytime(uid?: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${PLAYTIME_STORAGE_KEY}_${uid || "guest"}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGamePlaytime(uid: string | undefined, gameId: string, hours: number) {
  try {
    const key = `${PLAYTIME_STORAGE_KEY}_${uid || "guest"}`;
    const current = loadSavedPlaytime(uid);
    current[gameId] = hours;
    localStorage.setItem(key, JSON.stringify(current));
  } catch {}
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "library" | "store" | "community" | "profile" | "settings"
  >("library");
  const [selectedGameId, setSelectedGameId] = useState<string>("anime-battle");
  const [games, setGames] = useState<Game[]>(BASE_CATALOG);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const userRef = useRef<UserProfile | null>(null);
  const [runningGameIds, setRunningGameIds] = useState<string[]>([]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Global Download Manager State
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);
  const activeDownloadRef = useRef<ActiveDownload | null>(null);
  const downloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeDownloadRef.current = activeDownload;
  }, [activeDownload]);

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
      autoUpdate: false,
      enableDiscordRPC: false,
    };
  });

  const applySessionToState = (session: AuthSessionPayload) => {
    resizeForMainApp();
    setUser(session.user);
    setFriends(session.friends);
    const savedPlaytime = loadSavedPlaytime(session.user.uid);
    setGames((prev) =>
      prev.map((g) => ({
        ...g,
        playtime_hours: savedPlaytime[g.id] ?? g.playtime_hours ?? 0,
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

      const cloudCatalog = await authService.fetchCatalog(BASE_CATALOG);
      const activeSession = await authService.getActiveSession();
      if (activeSession) {
        await resizeForMainApp();
        setUser(activeSession.user);
        setFriends(activeSession.friends);
        const savedPlaytime = loadSavedPlaytime(activeSession.user.uid);
        setGames(
          cloudCatalog.map((g) => ({
            ...g,
            playtime_hours: savedPlaytime[g.id] ?? g.playtime_hours ?? 0,
            is_unlocked: activeSession.unlockedGameIds.includes(g.id),
            is_installed: activeSession.installedGameIds.includes(g.id),
          }))
        );
      } else {
        await resizeForLogin(false);
        const savedPlaytime = loadSavedPlaytime("guest");
        setGames(
          cloudCatalog.map((g) => ({
            ...g,
            playtime_hours: savedPlaytime[g.id] ?? g.playtime_hours ?? 0,
          }))
        );
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
            // Free the running lock for this game
            setRunningGameIds((prev) => prev.filter((id) => id !== game_id));

            const addedHours = Math.max(0.01, Math.round((duration_seconds / 3600) * 100) / 100);
            setGames((prev) =>
              prev.map((g) => {
                if (g.id !== game_id) return g;
                const newHours = Math.round(((g.playtime_hours || 0) + addedHours) * 10) / 10;
                saveGamePlaytime(userRef.current?.uid, game_id, newHours);
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

  // Global redirect interceptor: routes all external links cleanly to OS default browser
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (
        target &&
        target.href &&
        (target.href.startsWith("http://") || target.href.startsWith("https://"))
      ) {
        e.preventDefault();
        openExternal(target.href);
      }
    };
    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
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

          let needsUpdate = false;
          let updateInfo: Game["update_info"] = undefined;

          // If installed and differential manifest exists, query remote update state
          if (installed && g.manifest_url) {
            try {
              const res = await invoke<{
                needs_update: boolean;
                current_version?: string;
                latest_version: string;
                update_size_bytes: number;
                changed_files_count: number;
                total_files_count: number;
              }>("check_game_update", {
                gameId: g.id,
                manifestUrl: g.manifest_url,
                customDir: settings.installPath || null,
                authToken: settings.githubToken || null,
              });

              if (res.needs_update) {
                needsUpdate = true;
                updateInfo = {
                  latest_version: res.latest_version,
                  update_size_bytes: res.update_size_bytes,
                  changed_files_count: res.changed_files_count,
                };
              }
            } catch (checkErr) {
              console.warn(`[Updater] Check failed for ${g.id}:`, checkErr);
            }
          }

          return {
            ...g,
            is_installed: installed,
            needs_update: needsUpdate,
            update_info: updateInfo,
          };
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
      let result = "";
      if (game.manifest_url) {
        // Steam-like differential sync via manifest
        result = await invoke<string>("sync_game_differential", {
          gameId: game.id,
          manifestUrl: game.manifest_url,
          customDir: settings.installPath || null,
          authToken: settings.githubToken || null,
        });
      } else {
        // Fallback: full GitHub Release download via Tauri
        result = await invoke<string>("download_and_install_github_game", {
          gameId: game.id,
          githubRepo: game.github_repo,
          githubToken: settings.githubToken || null,
          customDir: settings.installPath || null,
          exeTarget: game.exe_target,
        });
      }

      console.log("Game installed/synced successfully:", result);
      if (user) {
        authService.setGameInstalled(user.uid, game.id, true);
      }
      setGames((prev) =>
        prev.map((g) =>
          g.id === game.id
            ? { ...g, is_installed: true, needs_update: false, update_info: undefined }
            : g
        )
      );
      setActiveDownload(null);
    } catch (err: any) {
      console.error("Game download/sync error:", err);
      alert(`การดาวน์โหลด/อัปเดตล้มเหลว: ${err?.message || err}`);
      setActiveDownload(null);
    }
  };

  const handleCancelDownload = () => {
    if (downloadTimerRef.current) {
      window.clearInterval(downloadTimerRef.current);
    }
    setActiveDownload(null);
  };

  // Automatic Game Update Trigger: If autoUpdate is enabled, automatically download patches for installed games
  useEffect(() => {
    if (!settings.autoUpdate || activeDownloadRef.current) return;
    const pendingGame = games.find((g) => g.is_installed && g.needs_update && g.manifest_url);
    if (pendingGame) {
      console.log(`[Auto-Update] Silently updating ${pendingGame.title} in background...`);
      handleStartDownload(pendingGame);
    }
  }, [games, settings.autoUpdate]);

  // Periodic Background Poller (every 20 seconds for game updates, entitlements, and friends)
  useEffect(() => {
    const refreshAll = async () => {
      // 1. Refresh fresh entitlements & friends from Cloud
      if (user) {
        try {
          const [freshEntitlements, freshFriends] = await Promise.all([
            authService.fetchUserEntitlements(user.uid),
            authService.fetchFriends(user.uid),
          ]);
          setGames((prev) =>
            prev.map((g) => ({
              ...g,
              is_unlocked: freshEntitlements.includes(g.id),
            }))
          );
          setFriends(freshFriends);
        } catch (e) {
          console.warn("Background cloud sync error:", e);
        }
      }

      // 2. Refresh game patches / version diffs
      refreshInstalledStatus();

      // 3. Check for Launcher App updates
      if (settings.autoUpdate) {
        try {
          const found = await check();
          if (found) {
            setAvailableUpdate(found);
            setIsUpdateModalOpen(true);
          }
        } catch {}
      }
    };

    const poller = setInterval(refreshAll, 20000);
    const onFocus = () => refreshAll();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(poller);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, settings.autoUpdate, settings.installPath]);

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
    setRunningGameIds([]);
    await resizeForLogin(false);
  };

  const ownedGames = games.filter((g) => g.is_unlocked);
  const selectedGame = ownedGames.find((g) => g.id === selectedGameId) || ownedGames[0] || null;
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
              onOpenStore={() => setActiveTab("store")}
              runningGameIds={runningGameIds}
            />

            <main className="flex-1 h-full overflow-hidden">
              {selectedGame ? (
                <GameDetails
                  game={selectedGame}
                  user={user}
                  installPath={settings.installPath}
                  onStatusChange={refreshInstalledStatus}
                  onOpenRedeemKey={() => setIsRedeemKeyOpen(true)}
                  onGoToStore={() => setActiveTab("store")}
                  activeDownload={activeDownload}
                  onStartDownload={handleStartDownload}
                  onCancelDownload={handleCancelDownload}
                  onUninstallGame={handleUninstallGame}
                  isRunning={runningGameIds.includes(selectedGame.id)}
                  onGameLaunched={(gameId) =>
                    setRunningGameIds((prev) => Array.from(new Set([...prev, gameId])))
                  }
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#172432] border border-[#2a475e]/60 flex items-center justify-center text-[#66c0f4] shadow-2xl">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h2 className="font-display text-xl font-black text-white uppercase tracking-wider">
                      คลังเกมของคุณยังว่างเปล่า
                    </h2>
                    <p className="text-xs text-[#8f98a0] leading-relaxed">
                      เริ่มต้นเล่นเกมของคุณโดยเลือกซื้อหรือรับเกมผ่าน Discord หรือใส่รหัสเปิดใช้งานเกม (Product Key) ที่ได้รับ
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("store")}
                      className="px-5 py-2.5 rounded bg-gradient-to-r from-[#1a9fff] to-[#0078d4] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#1a9fff]/20 cursor-pointer"
                    >
                      ไปยังหน้าร้านค้า (Store)
                    </button>
                    <button
                      onClick={() => setIsRedeemKeyOpen(true)}
                      className="px-5 py-2.5 rounded bg-[#212b38] hover:bg-[#2a475e] border border-[#2a475e] text-[#c7d5e0] hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      ใส่รหัสผลิตภัณฑ์ (Redeem Key)
                    </button>
                  </div>
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
        level={Math.max(
          1,
          Math.floor(
            games
              .filter((g) => g.is_unlocked)
              .reduce((sum, g) => sum + (g.playtime_hours || 0), 0) / 2
          ) + 1
        )}
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
