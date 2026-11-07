import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Download,
  Check,
  AlertCircle,
  FolderOpen,
  RefreshCw,
  Clock,
  Cloud,
  Settings,
  ExternalLink,
  MessageSquare,
  Key,
  ShieldCheck,
  Trash2,
  FileText,
  X,
  ShoppingBag,
  ArrowUpCircle,
} from "lucide-react";
import { Game, UserProfile } from "../types";

export interface ActiveDownload {
  gameId: string;
  gameTitle: string;
  progress: number;
  speed: string;
  downloadedMB: number;
  totalMB: number;
  isDownloading: boolean;
  isPaused?: boolean;
}

interface GameDetailsProps {
  game: Game;
  user?: UserProfile | null;
  installPath: string;
  onStatusChange: () => void;
  onOpenRedeemKey: () => void;
  onGoToStore: () => void;
  activeDownload: ActiveDownload | null;
  onStartDownload: (game: Game) => void;
  onCancelDownload: () => void;
  onUninstallGame: (gameId: string) => void;
  isRunning?: boolean;
  onGameLaunched?: (gameId: string) => void;
}

export const GameDetails: React.FC<GameDetailsProps> = ({
  game,
  user,
  installPath,
  onOpenRedeemKey,
  onGoToStore,
  activeDownload,
  onStartDownload,
  onCancelDownload,
  onUninstallGame,
  isRunning = false,
  onGameLaunched,
}) => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const isThisGameDownloading =
    activeDownload && activeDownload.gameId === game.id && activeDownload.isDownloading;

  useEffect(() => {
    setShowManageMenu(false);
    setFeedback(null);
  }, [game.id]);

  const handleLaunch = async () => {
    if (isRunning) return;
    setLoading(true);
    setFeedback(null);
    try {
      const pid = await invoke<number>("launch_game_executable", {
        gameId: game.id,
        customDir: installPath,
        exeTarget: game.exe_target,
        playerUid: user?.uid || null,
      });
      setIsError(false);
      setFeedback(`Game running (Process PID: ${pid})`);
      onGameLaunched?.(game.id);
    } catch (err: any) {
      setIsError(true);
      setFeedback(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseLocalFiles = async () => {
    setShowManageMenu(false);
    try {
      await invoke("open_game_folder", {
        gameId: game.id,
        customDir: installPath,
      });
      setFeedback(null);
    } catch (err: any) {
      setIsError(true);
      setFeedback(`Cannot open local folder: ${err?.message || err}`);
    }
  };

  const handleVerifyIntegrity = async () => {
    setShowManageMenu(false);
    setVerifying(true);
    setVerifyProgress(35);
    setFeedback(null);

    try {
      const fileCount = await invoke<number>("verify_game_files", {
        gameId: game.id,
        customDir: installPath || null,
        exeTarget: game.exe_target,
      });
      setVerifyProgress(100);
      setIsError(false);
      setFeedback(`ตรวจสอบความสมบูรณ์สำเร็จ: ตรวจพบไฟล์ตัวเกม ${fileCount} รายการ พร้อมเปิดใช้งาน`);
    } catch (err: any) {
      setVerifyProgress(100);
      setIsError(true);
      setFeedback(`การตรวจสอบไฟล์ล้มเหลว: ${err?.message || err}`);
    } finally {
      setTimeout(() => setVerifying(false), 500);
    }
  };

  const handleUninstall = () => {
    setShowManageMenu(false);
    onUninstallGame(game.id);
    setIsError(false);
    setFeedback(`${game.title} has been uninstalled from your computer.`);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#1b2838] select-none">
      {/* Massive Steam Hero Banner */}
      <div className="relative w-full h-72 lg:h-80 flex-shrink-0 bg-[#12141a] overflow-hidden">
        <img
          src={game.banner_url}
          alt={game.title}
          className="w-full h-full object-cover object-center opacity-55 scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] via-[#1b2838]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1b2838] via-transparent to-[#1b2838]/40" />

        {/* Top Right Quick Store Badge */}
        <div className="absolute top-5 right-8 flex items-center gap-2">
          <button
            onClick={onGoToStore}
            className="px-3 py-1.5 rounded bg-[#171d25]/80 hover:bg-[#2a475e] border border-[#2a475e]/60 text-xs text-[#c7d5e0] hover:text-white flex items-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#66c0f4]" />
            <span>Store Page</span>
          </button>
        </div>

        {/* Hero Title & Primary Action Bar */}
        <div className="absolute bottom-6 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-[#66c0f4] uppercase font-bold px-2 py-0.5 rounded bg-[#171d25]/90 border border-[#2a475e]/50">
                {game.category || "Action"}
              </span>
              <span className="text-[10px] font-mono text-[#8f98a0] bg-[#171d25]/80 px-2 py-0.5 rounded">
                {game.version || "v0.2.1"}
              </span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-black text-white tracking-wider drop-shadow-md">
              {game.title}
            </h1>
          </div>

          {/* Primary CTA Buttons (Flow: Locked -> Install -> Downloading -> Play) */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {!game.is_unlocked ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://discord.gg/Hh47ZMQsfF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-[#5865F2]/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>สั่งซื้อผ่าน Discord</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={onOpenRedeemKey}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded bg-[#212b38] hover:bg-[#2a475e] border border-[#2a475e] text-[#c7d5e0] hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Key className="w-4 h-4 text-[#ffd700]" />
                  <span>ใส่คีย์ (Redeem)</span>
                </button>
              </div>
            ) : isThisGameDownloading ? (
              <div className="flex items-center gap-2 bg-[#141d27]/95 border border-[#1a9fff]/50 px-4 py-2.5 rounded-lg shadow-xl">
                <Download className="w-4 h-4 text-[#1a9fff] animate-bounce" />
                <div className="w-44 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white font-bold">
                      DOWNLOADING {Math.round(activeDownload.progress)}%
                    </span>
                    <span className="text-[#66c0f4]">{activeDownload.speed}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0e131a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1a9fff] to-[#66c0f4] transition-all duration-200"
                      style={{ width: `${activeDownload.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={onCancelDownload}
                  className="p-1.5 rounded hover:bg-red-500/20 text-[#8f98a0] hover:text-red-400 transition-colors cursor-pointer"
                  title="Cancel Download"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : game.is_installed && game.needs_update ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onStartDownload(game)}
                  disabled={loading}
                  className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded bg-gradient-to-r from-[#1a9fff] to-[#0078d4] hover:brightness-110 active:scale-[0.98] text-white font-display font-black text-xs tracking-widest uppercase transition-all shadow-xl shadow-[#1a9fff]/30 focus-visible:ring-2 focus-visible:ring-[#66c0f4] focus-visible:outline-none cursor-pointer disabled:opacity-50"
                >
                  <ArrowUpCircle className="w-4 h-4 text-white animate-pulse" />
                  <span>
                    UPDATE {game.update_info ? `(${(game.update_info.update_size_bytes / (1024 * 1024)).toFixed(1)} MB)` : "PATCH"}
                  </span>
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={loading || verifying}
                  className="px-4 py-3.5 rounded bg-[#212b38] hover:bg-[#2a475e] border border-[#2a475e] text-[#c7d5e0] hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  title="Launch currently installed version without updating"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isRunning ? (
              <button
                disabled
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded bg-[#17222d] border border-[#a4d007]/50 text-[#a4d007] font-display font-black text-xs tracking-widest uppercase shadow-lg shadow-[#a4d007]/10 cursor-not-allowed opacity-90"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#a4d007] animate-ping inline-block" />
                <span>NOW PLAYING</span>
              </button>
            ) : game.is_installed ? (
              <button
                onClick={handleLaunch}
                disabled={loading || verifying}
                className="group relative inline-flex items-center gap-3 px-10 py-3.5 rounded bg-gradient-to-r from-[#799905] via-[#a4d007] to-[#799905] hover:brightness-110 active:scale-[0.98] text-black font-display font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-[#a4d007]/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black text-black" />
                )}
                <span>PLAY</span>
              </button>
            ) : (
              <button
                onClick={() => onStartDownload(game)}
                disabled={loading}
                className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded bg-gradient-to-r from-[#1a9fff] to-[#0078d4] hover:brightness-110 active:scale-[0.98] text-white font-display font-black text-xs tracking-widest uppercase transition-all shadow-xl shadow-[#1a9fff]/25 focus-visible:ring-2 focus-visible:ring-[#66c0f4] focus-visible:outline-none cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>INSTALL GAME</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Steam Action & Telemetry Sub-Bar */}
      <div className="bg-[#141d27] border-y border-[#2a475e]/40 px-8 py-3 flex items-center justify-between text-xs text-[#8f98a0] relative">
        <div className="flex items-center gap-8">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#5c6873] block">
              Status
            </span>
            <span className="text-[#c7d5e0] font-semibold flex items-center gap-1.5">
              {!game.is_unlocked ? (
                <span className="text-[#f43f5e]">Locked (Buy on Discord)</span>
              ) : game.needs_update ? (
                <span className="text-[#66c0f4] font-semibold flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5 text-[#1a9fff] animate-pulse" />
                  <span>Update Available ({game.update_info?.latest_version || "New patch"})</span>
                </span>
              ) : isRunning ? (
                <span className="text-[#a4d007] font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#a4d007] animate-ping" />
                  <span>Running</span>
                </span>
              ) : game.is_installed ? (
                <span className="text-[#a4d007]">Ready to Play</span>
              ) : (
                <span className="text-[#66c0f4]">Not Installed (1.2 GB)</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#5c6873] block">
              Last Played
            </span>
            <span className="text-[#c7d5e0] font-medium">
              {game.last_played || "Never"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#5c6873] block">
              Play Time
            </span>
            <div className="flex items-center gap-1 text-[#c7d5e0] font-medium">
              <Clock className="w-3 h-3 text-[#66c0f4]" />
              <span>{game.playtime_hours || 0} hours</span>
            </div>
          </div>

          <div className="hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-[#5c6873] block">
              Cloud Sync
            </span>
            <div className="flex items-center gap-1 text-[#a4d007] font-medium">
              <Cloud className="w-3.5 h-3.5" />
              <span>Synchronized</span>
            </div>
          </div>
        </div>

        {/* Right File Management Controls */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={handleBrowseLocalFiles}
            className="px-2.5 py-1.5 rounded bg-[#1b2838] hover:bg-[#2a475e] text-[#c7d5e0] hover:text-white flex items-center gap-1.5 text-[11px] border border-[#2a475e]/50 transition-colors cursor-pointer"
            title="Browse Local Game Files"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#66c0f4]" />
            <span className="hidden md:inline">Browse Local Files</span>
          </button>

          <button
            onClick={() => setShowManageMenu(!showManageMenu)}
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              showManageMenu
                ? "bg-[#2a475e] text-white border-[#66c0f4]"
                : "bg-[#1b2838] hover:bg-[#2a475e]/60 text-[#c7d5e0] border-[#2a475e]/50"
            }`}
            title="Manage Game Installation"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Manage Game Dropdown Menu */}
          {showManageMenu && (
            <div className="absolute right-0 top-10 w-56 bg-[#171d25] border border-[#2a475e] rounded-lg shadow-2xl py-1.5 z-30 text-xs">
              <button
                onClick={handleBrowseLocalFiles}
                className="w-full text-left px-3.5 py-2 hover:bg-[#2a475e]/50 text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#66c0f4]" />
                <span>Open Install Folder</span>
              </button>
              <button
                onClick={handleVerifyIntegrity}
                className="w-full text-left px-3.5 py-2 hover:bg-[#2a475e]/50 text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verify File Integrity</span>
              </button>
              {game.is_installed && (
                <>
                  <div className="my-1 border-t border-[#2a475e]/40" />
                  <button
                    onClick={handleUninstall}
                    className="w-full text-left px-3.5 py-2 hover:bg-red-950/50 text-red-400 hover:text-red-300 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Uninstall Game</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 space-y-6 flex-1 max-w-6xl">
        {/* Active Download Full Progress Card */}
        {isThisGameDownloading && (
          <div className="bg-[#121922] border border-[#1a9fff]/50 rounded-lg p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-[#1a9fff] animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Downloading & Extracting Package...
                  </h4>
                  <p className="text-[11px] text-[#8f98a0] font-mono">
                    {activeDownload.downloadedMB} MB / {activeDownload.totalMB} MB ({activeDownload.speed})
                  </p>
                </div>
              </div>
              <span className="text-lg font-mono font-black text-[#66c0f4]">
                {Math.round(activeDownload.progress)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#0b1016] rounded-full overflow-hidden border border-[#2a475e]/40">
              <div
                className="h-full bg-gradient-to-r from-[#1a9fff] via-[#66c0f4] to-[#a4d007] transition-all duration-200"
                style={{ width: `${activeDownload.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* File Verification Progress Bar */}
        {verifying && (
          <div className="bg-[#121922] border border-emerald-500/40 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Verifying local game files...
              </span>
              <span className="font-mono text-white">{verifyProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#0b1016] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-200"
                style={{ width: `${verifyProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Feedback Toast */}
        {feedback && (
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
              isError
                ? "bg-red-950/40 border-red-500/40 text-red-300"
                : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isError ? (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
              <span>{feedback}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Two-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Patch Notes & Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patch Notes / Recent Updates */}
            <div className="bg-[#141d27] border border-[#2a475e]/40 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a475e]/30 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#66c0f4]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                    Recent Patch Notes & Changelog
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[#66c0f4] bg-[#2a475e]/30 px-2 py-0.5 rounded">
                  Latest Build
                </span>
              </div>

              <div className="space-y-4">
                {game.patch_notes && game.patch_notes.length > 0 ? (
                  game.patch_notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="bg-[#10161f] border border-[#2a475e]/25 rounded p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#a4d007] font-mono">
                          {note.version}
                        </span>
                        <span className="text-[10px] text-[#8f98a0] font-mono">
                          {note.date}
                        </span>
                      </div>
                      <ul className="space-y-1 text-xs text-[#c7d5e0] list-disc list-inside">
                        {note.changes.map((c, i) => (
                          <li key={i} className="leading-relaxed">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#10161f] border border-[#2a475e]/25 rounded p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">
                        Build Version: {game.version || "v1.0.0"}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                        Verified Package
                      </span>
                    </div>
                    <p className="text-xs text-[#8f98a0] leading-relaxed">
                      ไฟล์และบันทึกการอัปเดตของเกมได้รับการซิงก์จาก Cloudflare R2 CDN สามารถติดตามรายการอัปเดตและความเคลื่อนไหวทั้งหมดได้ที่แท็บ Patch Notes
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* About This Game */}
            <div className="bg-[#141d27] border border-[#2a475e]/30 rounded-lg p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                About This Game
              </h2>
              <p className="text-xs text-[#c7d5e0] leading-relaxed">
                {game.description}
              </p>
              {game.tags && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2.5 py-0.5 rounded bg-[#2a475e]/40 text-[#66c0f4] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Achievements, Discord Support & Specs */}
          <div className="space-y-6">
            {/* Verified Game Telemetry Card */}
            <div className="bg-[#141d27] p-5 rounded-lg border border-[#2a475e]/30 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Game Telemetry
                </span>
              </div>
              <div className="space-y-2 text-xs text-[#8f98a0] pt-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span>Total Time Played:</span>
                  <span className="text-white font-mono font-bold">{game.playtime_hours ? `${game.playtime_hours} hrs` : "0.0 hrs"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Installation Status:</span>
                  <span className={game.is_installed ? "text-[#a4d007] font-semibold" : "text-[#66c0f4]"}>
                    {game.is_installed ? "Installed & Verified" : "Ready to Download"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Cloud Save Sync:</span>
                  <span className="text-[#c7d5e0]">Available</span>
                </div>
              </div>
            </div>

            {/* Discord Direct Help / Purchase Box */}
            <div className="bg-gradient-to-br from-[#1e2330] to-[#141d27] p-5 rounded-lg border border-[#5865F2]/40 space-y-3">
              <div className="flex items-center gap-2 text-[#5865F2] font-bold text-xs uppercase">
                <MessageSquare className="w-4 h-4" />
                <span>Discord Support & Store</span>
              </div>
              <p className="text-[11px] text-[#b8b6b4] leading-relaxed">
                ต้องการสั่งซื้อคีย์เกม แจ้งโอนเงิน หรือปลดล็อกเกมผ่าน UID ติดต่อทีมงานใน Discord ได้ตลอด 24 ชม.
              </p>
              <a
                href="https://discord.gg/Hh47ZMQsfF"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>ไปที่ Discord Server</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
