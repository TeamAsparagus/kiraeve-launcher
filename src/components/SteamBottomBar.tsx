import React from "react";
import { Download, CheckCircle2, Users, ExternalLink, MessageSquare } from "lucide-react";

interface DownloadStatus {
  gameId: string;
  gameTitle: string;
  progress: number;
  speed: string;
  downloadedMB: number;
  totalMB: number;
  isDownloading: boolean;
}

interface SteamBottomBarProps {
  downloadStatus: DownloadStatus | null;
  onlineFriendsCount: number;
  onOpenFriends: () => void;
  onOpenLibrary: () => void;
}

export const SteamBottomBar: React.FC<SteamBottomBarProps> = ({
  downloadStatus,
  onlineFriendsCount,
  onOpenFriends,
  onOpenLibrary,
}) => {
  const isDownloading = downloadStatus && downloadStatus.isDownloading;

  return (
    <footer className="h-7 w-full bg-[#12161c] border-t border-[#212b38] px-3 flex items-center justify-between text-[11px] text-[#8f98a0] select-none z-30 flex-shrink-0">
      {/* Left: Download status */}
      <div className="flex items-center gap-3">
        {isDownloading ? (
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-2 text-[#66c0f4] hover:text-white transition-colors cursor-pointer group"
          >
            <Download className="w-3.5 h-3.5 animate-bounce text-[#1a9fff]" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              DOWNLOADING: {downloadStatus.gameTitle} ({Math.round(downloadStatus.progress)}%)
            </span>
            <span className="text-[10px] text-[#8f98a0] font-mono group-hover:text-[#c7d5e0]">
              • {downloadStatus.speed}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-[#5c6873]">
            <CheckCircle2 className="w-3 h-3 text-[#388e3c]" />
            <span className="text-[10px] tracking-wide">DOWNLOADS: All games up to date</span>
          </div>
        )}
      </div>

      {/* Right: Discord Quick Link & Friends Chat */}
      <div className="flex items-center gap-4">
        {/* Discord Join Link */}
        <a
          href="https://discord.gg/Hh47ZMQsfF"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[#8f98a0] hover:text-[#5865F2] transition-colors cursor-pointer"
          title="Join Official Kiraeve Discord"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Kiraeve Discord</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>

        <div className="h-3 w-[1px] bg-[#212b38]" />

        {/* Friends & Chat Button */}
        <button
          onClick={onOpenFriends}
          className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-[#1f2835] text-[#b8b6b4] hover:text-white transition-colors cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3.5 h-3.5 text-[#66c0f4]" />
          <span className="text-[11px] font-medium tracking-wide">
            FRIENDS & CHAT ({onlineFriendsCount})
          </span>
        </button>
      </div>
    </footer>
  );
};
