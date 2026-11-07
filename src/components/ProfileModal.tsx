import React, { useState, useRef } from "react";
import { X, Save, Copy, Check, Shield, User, Camera, Upload } from "lucide-react";
import { UserProfile } from "../types";

interface ProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  level?: number;
  onClose: () => void;
  onSaveProfile: (updated: UserProfile) => void;
}

function makeSvgAvatar(letter: string, bg: string, stroke: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${bg}"/><circle cx="64" cy="64" r="42" fill="none" stroke="${stroke}" stroke-width="3"/><text x="50%" y="54%" font-family="system-ui,sans-serif" font-weight="900" font-size="46" fill="${stroke}" dominant-baseline="middle" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PRESET_AVATARS = [
  makeSvgAvatar("K", "#101620", "#66c0f4"),
  makeSvgAvatar("P", "#181324", "#a855f7"),
  makeSvgAvatar("X", "#1c1417", "#f43f5e"),
  makeSvgAvatar("A", "#111c16", "#10b981"),
  makeSvgAvatar("Z", "#1e1810", "#f59e0b"),
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  level,
  onClose,
  onSaveProfile,
}) => {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || "Playing Asparagus games on desktop.");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || PRESET_AVATARS[0]);
  const [status, setStatus] = useState<"online" | "in-game" | "away" | "offline">(user.status || "online");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
              setAvatarUrl(optimized);
            } else {
              setAvatarUrl(reader.result as string);
            }
          };
          img.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSaveProfile({
      ...user,
      username,
      bio,
      avatar_url: avatarUrl,
      status,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="relative w-full max-w-lg bg-[#181a21] border border-[#2a475e]/60 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Steam-style Title Bar */}
        <div className="bg-[#171a21] px-6 py-3.5 border-b border-[#2a475e]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#66c0f4]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#c7d5e0]">
              Edit Profile
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Avatar & Header Preview */}
          <div className="flex items-center gap-5 p-4 rounded-lg bg-[#12141a] border border-[#2a475e]/30">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div
                className={`w-20 h-20 rounded-lg p-0.5 border-2 ${
                  status === "in-game"
                    ? "border-[#a4d007]"
                    : status === "online"
                    ? "border-[#66c0f4]"
                    : "border-gray-500"
                } overflow-hidden bg-black`}
              >
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <div
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#12141a] ${
                  status === "in-game"
                    ? "bg-[#a4d007]"
                    : status === "online"
                    ? "bg-[#66c0f4]"
                    : "bg-gray-500"
                }`}
              />
              <div className="absolute inset-0 bg-black/60 rounded flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                <Upload className="w-4 h-4 mb-0.5" />
                <span>Upload</span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {username || "Username"}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2a475e]/40 text-[#66c0f4] border border-[#66c0f4]/30">
                  Level {level ?? user.level ?? 1}
                </span>
              </div>
              <p className="text-xs text-[#8f98a0] line-clamp-1">
                {bio}
              </p>

              {/* UID Box */}
              <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                <span className="text-[#8f98a0]">Permanent UID:</span>
                <span className="text-[#66c0f4] font-bold">{user.uid}</span>
                <button
                  onClick={handleCopyUid}
                  className="p-1 text-muted-foreground hover:text-white rounded cursor-pointer"
                  title="Copy UID"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Direct File Upload & Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#8f98a0] uppercase tracking-wider block">
                Avatar Image
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#2a475e] hover:bg-[#385c79] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload from Device</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all cursor-pointer ${
                    avatarUrl === url
                      ? "border-[#66c0f4] scale-105 shadow-md shadow-[#66c0f4]/20"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-[#8f98a0] block mb-1">
                Profile Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#12141a] border border-[#2a475e]/60 rounded px-3 py-2 text-xs text-[#c7d5e0] focus:outline-none focus:border-[#66c0f4] transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8f98a0] block mb-1">
                Custom Avatar Image URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-[#12141a] border border-[#2a475e]/60 rounded px-3 py-2 text-xs text-[#c7d5e0] focus:outline-none focus:border-[#66c0f4] transition-colors"
                  placeholder="https://... or choose from device"
                />
                <Camera className="w-3.5 h-3.5 text-[#4e5963] absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8f98a0] block mb-1">
                About / Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#12141a] border border-[#2a475e]/60 rounded px-3 py-2 text-xs text-[#c7d5e0] focus:outline-none focus:border-[#66c0f4] transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8f98a0] block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full bg-[#12141a] border border-[#2a475e]/60 rounded px-3 py-2 text-xs text-[#c7d5e0] focus:outline-none focus:border-[#66c0f4] transition-colors cursor-pointer"
              >
                <option value="online">Online (Blue)</option>
                <option value="in-game">In-Game (Green)</option>
                <option value="away">Away (Amber)</option>
                <option value="offline">Invisible (Grey)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#171a21] px-6 py-3.5 border-t border-[#2a475e]/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8f98a0]">
            <Shield className="w-3.5 h-3.5 text-[#66c0f4]" />
            <span>Synced to Supabase Profiles</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs text-[#c7d5e0] hover:text-white hover:bg-[#2a475e]/30 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded bg-gradient-to-r from-[#47bfff] to-[#1a9fff] hover:from-[#5bc5ff] hover:to-[#2ea5ff] text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saved ? "Saved!" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
