import React, { useRef, useState } from "react";
import {
  Upload,
  Copy,
  Check,
  Shield,
  Edit3,
  Image as ImageIcon,
  LogOut,
  Activity,
} from "lucide-react";
import { UserProfile, Game } from "../types";
import { generateDefaultAvatar } from "../lib/authService";

interface ProfilePageProps {
  user: UserProfile;
  games: Game[];
  onUpdateUser: (updated: UserProfile) => void;
  onOpenEditModal: () => void;
  onSelectGame: (gameId: string) => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  games,
  onUpdateUser,
  onOpenEditModal,
  onSelectGame,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const size = 256;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
              const optimized = canvas.toDataURL("image/jpeg", 0.85);
              onUpdateUser({ ...user, avatar_url: optimized });
            } else {
              onUpdateUser({ ...user, avatar_url: reader.result as string });
            }
            setUploadFeedback("Avatar updated and optimized!");
            setTimeout(() => setUploadFeedback(null), 3000);
          };
          img.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxW = 1280;
            const maxH = 720;
            let w = img.width;
            let h = img.height;
            if (w > maxW || h > maxH) {
              const ratio = Math.min(maxW / w, maxH / h);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const optimized = canvas.toDataURL("image/jpeg", 0.82);
              onUpdateUser({ ...user, background_url: optimized });
            } else {
              onUpdateUser({ ...user, background_url: reader.result as string });
            }
            setUploadFeedback("Profile background updated and optimized!");
            setTimeout(() => setUploadFeedback(null), 3000);
          };
          img.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const unlockedGames = games.filter((g) => g.is_unlocked);
  const totalPlaytimeNum = unlockedGames.reduce((sum, g) => sum + (g.playtime_hours || 0), 0);
  const totalPlaytimeHours = totalPlaytimeNum.toFixed(1);

  // Dynamic Level Calculation: Every 2 hours played = +1 Level
  const calculatedLevel = Math.max(1, Math.floor(totalPlaytimeNum / 2) + 1);
  const progressInLevelHours = Math.round((totalPlaytimeNum % 2) * 10) / 10;
  const percentToNextLevel = Math.min(100, Math.round((progressInLevelHours / 2) * 100));

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1b2838] select-none text-[#c7d5e0] animate-page-enter">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFile}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={bgInputRef}
        onChange={handleBackgroundFile}
        accept="image/*"
        className="hidden"
      />

      {/* Steam Profile Background Banner */}
      <div className="relative w-full h-72 bg-[#10151c] overflow-hidden">
        {user.background_url ? (
          <img
            src={user.background_url}
            alt="Profile Background"
            className="w-full h-full object-cover opacity-60 filter blur-[0.5px]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#171d25] via-[#1b2838] to-[#131b26]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] via-transparent to-transparent" />

        <button
          onClick={() => bgInputRef.current?.click()}
          className="absolute top-4 right-6 flex items-center gap-2 px-3 py-1.5 rounded bg-[#171d25]/90 hover:bg-[#253243] text-xs text-[#c7d5e0] hover:text-white border border-[#2b3a4c] transition-all backdrop-blur-sm cursor-pointer shadow-lg hover:scale-105"
          title="Upload custom background image"
        >
          <ImageIcon className="w-4 h-4 text-[#66c0f4]" />
          <span>Upload Background</span>
        </button>
      </div>

      {/* Main Profile Content Container */}
      <div className="max-w-5xl mx-auto px-8 -mt-24 relative pb-16 space-y-8">
        {uploadFeedback && (
          <div className="p-3 bg-green-950/80 border border-green-500/50 rounded flex items-center gap-2 text-xs text-green-300 font-mono shadow-2xl animate-in fade-in">
            <Check className="w-4 h-4 text-green-400" />
            <span>{uploadFeedback}</span>
          </div>
        )}

        {/* Authentic Steam Profile Header Showcase Card */}
        <div className="bg-[#171d25]/95 border border-[#263445] rounded-xl p-6 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 steam-card-glow">
          <div className="flex items-center gap-6">
            {/* 128px Steam Avatar Frame with Local Upload */}
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <div
                className={`w-32 h-32 rounded-md p-1 border-2 ${
                  user.status === "in-game"
                    ? "border-[#a4d007] shadow-lg shadow-[#a4d007]/20"
                    : user.status === "online"
                    ? "border-[#66c0f4] shadow-lg shadow-[#66c0f4]/20"
                    : "border-gray-500"
                } overflow-hidden bg-black`}
              >
                <img
                  src={user.avatar_url || generateDefaultAvatar(user.username)}
                  alt={user.username}
                  className="w-full h-full object-cover rounded-sm"
                />
              </div>

              {/* Upload Hover Overlay */}
              <div
                className="absolute inset-0 bg-black/65 rounded-md flex flex-col items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                title="Click to upload avatar from your device"
              >
                <Upload className="w-6 h-6 mb-1 text-[#66c0f4]" />
                <span>Upload</span>
              </div>

              {/* Status Indicator */}
              <div
                className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-[#171d25] ${
                  user.status === "in-game"
                    ? "bg-[#a4d007]"
                    : user.status === "online"
                    ? "bg-[#66c0f4]"
                    : "bg-gray-500"
                }`}
              />
            </div>

            {/* Profile Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-wide">
                  {user.username}
                </h1>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    user.status === "in-game"
                      ? "bg-[#a4d007]/10 text-[#a4d007] border-[#a4d007]/30"
                      : "bg-[#66c0f4]/10 text-[#66c0f4] border-[#66c0f4]/30"
                  }`}
                >
                  {user.status === "in-game" ? "Currently In-Game" : user.status || "Online"}
                </span>
              </div>

              <p className="text-xs text-[#8f98a0] max-w-md leading-relaxed">
                {user.bio || "Playing Asparagus games on desktop."}
              </p>

              {/* Permanent UID Badge */}
              <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                <span className="text-[#8f98a0]">Permanent User ID:</span>
                <span className="px-2.5 py-0.5 rounded bg-[#10141a] border border-[#2b3a4c] text-[#66c0f4] font-bold">
                  {user.uid}
                </span>
                <button
                  onClick={handleCopyUid}
                  className="p-1 hover:text-white rounded hover:bg-[#253243] transition-colors cursor-pointer"
                  title="Copy UID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[#8f98a0]" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Section: Level Badge & Steam Actions */}
          <div className="flex flex-col items-end gap-3 self-stretch md:self-center">
            <div className="flex items-center gap-3">
              {/* Dynamic Playtime Level Badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b2838] border-2 border-[#66c0f4] shadow-md">
                <span className="text-xs text-[#8f98a0] font-bold uppercase">Level</span>
                <span className="text-base font-black text-white">{calculatedLevel}</span>
              </div>

              <button
                onClick={onOpenEditModal}
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#253243] hover:bg-[#314258] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 border border-[#3b4e66]"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#66c0f4]" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-destructive/15 hover:bg-destructive text-red-300 hover:text-white text-xs font-bold border border-destructive/40 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                title="Sign out of this account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* EXP Progress Bar toward Next Level */}
            <div className="w-56 space-y-1 bg-[#10141a]/80 p-2 rounded-lg border border-[#263445]">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-[#8f98a0]">Level {calculatedLevel} EXP</span>
                <span className="text-[#66c0f4] font-bold">
                  {progressInLevelHours.toFixed(1)} / 2.0 hrs
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1b2838] rounded-full overflow-hidden border border-[#2a475e]/30">
                <div
                  className="h-full bg-gradient-to-r from-[#1a9fff] to-[#66c0f4] transition-all duration-300"
                  style={{ width: `${percentToNextLevel}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => avatarInputRef.current?.click()}
              className="text-xs text-[#66c0f4] hover:underline flex items-center gap-1.5 cursor-pointer pt-0.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Avatar from Device (.png, .jpg)</span>
            </button>
          </div>
        </div>

        {/* Profile Stats Showcases (Badges Removed) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#171d25] p-5 rounded-lg border border-[#263445] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8f98a0] uppercase font-bold">Account Status</span>
              <span className="text-emerald-400 font-mono font-bold">Active</span>
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs text-[#c7d5e0]">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Verified Cloud Account</span>
            </div>
            <p className="text-[11px] text-[#8f98a0]">
              UID: {user.uid}
            </p>
          </div>

          <div className="bg-[#171d25] p-5 rounded-lg border border-[#263445] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8f98a0] uppercase font-bold">Games in Library</span>
              <span className="text-white font-mono font-bold">{unlockedGames.length}</span>
            </div>
            <p className="text-xs text-[#8f98a0] pt-1">
              All entitlements verified via permanent UID.
            </p>
          </div>

          <div className="bg-[#171d25] p-5 rounded-lg border border-[#263445] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8f98a0] uppercase font-bold">Total Playtime</span>
              <span className="text-white font-mono font-bold">{totalPlaytimeHours} hrs</span>
            </div>
            <p className="text-xs text-[#8f98a0] pt-1">
              {totalPlaytimeNum > 0 ? "2 hrs of gameplay grants +1 Account Level." : "Start playing games to gain Playtime EXP!"}
            </p>
          </div>
        </div>

        {/* Recent Activity Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#66c0f4]" />
              <span>Recent Activity</span>
            </h2>
            <span className="text-xs text-[#8f98a0]">
              Past 2 weeks
            </span>
          </div>

          <div className="space-y-3">
            {unlockedGames.map((game) => (
              <div
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                className="bg-[#171d25] border border-[#263445] hover:border-[#1a9fff] p-4 rounded-lg flex items-center justify-between gap-4 transition-all cursor-pointer group steam-card-glow"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-24 h-14 rounded overflow-hidden bg-black flex-shrink-0 border border-[#263445]">
                    <img
                      src={game.banner_url}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-[#66c0f4] transition-colors truncate">
                      {game.title}
                    </h3>
                    <p className="text-[11px] text-[#8f98a0] truncate font-mono">
                      Target: {game.exe_target} | Last played: {game.last_played || "Today"}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-mono font-bold text-white block">
                    {game.playtime_hours ? `${game.playtime_hours} hrs` : "0.0 hrs"} on record
                  </span>
                  <span className="text-[10px] text-[#a4d007] font-semibold">
                    {game.is_installed ? "Ready to Play" : "Available to install"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
