import React, { useState } from "react";
import { X, Users, UserPlus, Check, Search, Gamepad2, AlertCircle } from "lucide-react";
import { Friend } from "../types";

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  onAddFriend: (uid: string) => Promise<{ ok: boolean; message: string }>;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  friends,
  onAddFriend,
}) => {
  const [friendUid, setFriendUid] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "in-game" | "online" | "offline">("all");

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!friendUid.trim()) return;
    const res = await onAddFriend(friendUid.trim().toUpperCase());
    setFeedback(res);
    if (res.ok) {
      setFriendUid("");
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  // Search by username or UID
  const filtered = friends.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      f.username.toLowerCase().includes(q) ||
      f.uid.toLowerCase().includes(q) ||
      (f.game_playing && f.game_playing.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (activeFilter === "in-game") return f.status === "in-game";
    if (activeFilter === "online") return f.status === "online";
    if (activeFilter === "offline") return f.status === "offline" || f.status === "away";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#1b2838] border border-[#2a475e]/80 rounded shadow-2xl flex flex-col h-[540px] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Steam Friends Titlebar */}
        <div className="bg-[#171a21] px-4 py-2.5 border-b border-[#2a475e]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#66c0f4]" />
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              Friends List ({friends.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8f98a0] hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add Friend Input Bar */}
        <div className="p-3 bg-[#141d27] border-b border-[#2a475e]/40 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={friendUid}
              onChange={(e) => setFriendUid(e.target.value)}
              placeholder="Add friend by UID (e.g. KE-XXXXXX)"
              className="flex-1 bg-[#101216] border border-[#2a475e]/60 rounded px-2.5 py-1.5 text-xs text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] uppercase font-mono"
            />
            <button
              onClick={handleAdd}
              className="px-3.5 py-1.5 bg-[#2a475e] hover:bg-[#385c79] text-white text-xs font-semibold rounded flex items-center gap-1 cursor-pointer transition-colors shadow"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {feedback && (
            <div
              className={`p-2 rounded border text-[11px] flex items-center gap-1.5 ${
                feedback.ok
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-red-950/40 border-red-500/40 text-red-300"
              }`}
            >
              {feedback.ok ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Search by Name & UID */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username, UID, or game..."
              className="w-full bg-[#101216] border border-[#2a475e]/40 rounded px-2.5 py-1.5 pl-7 text-xs text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4]"
            />
            <Search className="w-3.5 h-3.5 text-[#4e5963] absolute left-2 top-2" />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 pt-0.5">
            {[
              { id: "all", label: "All" },
              { id: "in-game", label: "In-Game" },
              { id: "online", label: "Online" },
              { id: "offline", label: "Offline" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? "bg-[#66c0f4]/20 text-[#66c0f4] border border-[#66c0f4]/40"
                    : "text-[#8f98a0] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Friends List Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {friends.length === 0 ? (
            <div className="py-12 text-center space-y-1.5 px-4">
              <Users className="w-8 h-8 text-[#4e5963] mx-auto" />
              <p className="text-xs text-[#c7d5e0] font-semibold">ยังไม่มีรายชื่อเพื่อนในบัญชีนี้</p>
              <p className="text-[11px] text-[#8f98a0]">
                กรอกรหัส UID ของเพื่อน (เช่น KE-XXXXXX) ด้านบนเพื่อเพิ่มเพื่อนเข้าสู่ลิสต์ของคุณ
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-xs text-[#8f98a0]">No friends found matching &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-[10px] text-[#4e5963]">Try searching with exact username or UID</p>
            </div>
          ) : (
            filtered.map((f) => (
              <div
                key={f.uid}
                className="flex items-center justify-between p-2 rounded-lg bg-[#141d27]/60 hover:bg-[#203144] border border-transparent hover:border-[#2a475e]/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={f.avatar_url}
                      alt={f.username}
                      className="w-9 h-9 rounded object-cover"
                    />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1b2838] ${
                        f.status === "in-game"
                          ? "bg-[#a4d007]"
                          : f.status === "online"
                          ? "bg-[#66c0f4]"
                          : "bg-gray-500"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        f.status === "in-game"
                          ? "text-[#a4d007]"
                          : f.status === "online"
                          ? "text-[#66c0f4]"
                          : "text-[#8f98a0]"
                      }`}
                    >
                      {f.username}
                    </p>
                    {f.game_playing ? (
                      <p className="text-[10px] text-[#a4d007] truncate flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Playing {f.game_playing}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#4e5963] font-mono truncate">
                        {f.status === "online" ? "Online" : "Offline"} | {f.uid}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-mono text-[#4e5963] group-hover:text-[#66c0f4] transition-colors flex-shrink-0 ml-2">
                  {f.uid}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
