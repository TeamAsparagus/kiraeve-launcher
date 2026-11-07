import React, { useState } from "react";
import {
  X,
  Users,
  UserPlus,
  Check,
  Search,
  Gamepad2,
  AlertCircle,
  ChevronLeft,
  Copy,
} from "lucide-react";
import { Friend, UserProfile } from "../types";
import { authService, generateDefaultAvatar } from "../lib/authService";

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

  // Selected Friend Profile State
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [copiedUid, setCopiedUid] = useState(false);

  if (!isOpen) return null;

  const handleSelectFriend = async (f: Friend) => {
    setSelectedFriend(f);
    setLoadingProfile(true);
    try {
      const p = await authService.fetchUserProfileByUid(f.uid);
      setSelectedProfile(p);
    } catch {
      setSelectedProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

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
        {selectedFriend ? (
          /* Friend Full Profile View */
          <div className="flex flex-col h-full bg-[#1b2838] animate-in fade-in slide-in-from-right-4 duration-150">
            {/* Top Navigation Bar */}
            <div className="bg-[#171a21] px-3.5 py-2.5 border-b border-[#2a475e]/50 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedFriend(null);
                  setSelectedProfile(null);
                }}
                className="flex items-center gap-1.5 text-xs text-[#8f98a0] hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#66c0f4]" />
                <span className="font-semibold">กลับไปยังรายชื่อเพื่อน</span>
              </button>
              <button
                onClick={onClose}
                className="text-[#8f98a0] hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Content Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Profile Header Banner */}
              <div className="relative h-24 w-full bg-gradient-to-r from-[#17202d] via-[#1b2838] to-[#1e2a38] overflow-hidden border-b border-[#2a475e]/40">
                {selectedProfile?.background_url && (
                  <img
                    src={selectedProfile.background_url}
                    alt=""
                    className="w-full h-full object-cover opacity-35"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] via-transparent to-transparent" />
                <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10141b]/80 border border-[#2a475e]/60 text-[10px] text-[#8f98a0]">
                  <span>Level</span>
                  <span className="font-bold text-[#66c0f4]">{selectedProfile?.level || 1}</span>
                </div>
              </div>

              {/* Avatar & User Details */}
              <div className="px-5 -mt-8 relative space-y-4 pb-5">
                <div className="flex items-end justify-between">
                  <div className="relative">
                    <img
                      src={
                        selectedFriend.avatar_url ||
                        selectedProfile?.avatar_url ||
                        generateDefaultAvatar(selectedFriend.username)
                      }
                      alt={selectedFriend.username}
                      className="w-16 h-16 rounded-md object-cover border-2 border-[#2a475e] shadow-xl bg-[#141d27]"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#1b2838] ${
                        selectedFriend.status === "in-game"
                          ? "bg-[#a4d007]"
                          : selectedFriend.status === "online"
                          ? "bg-[#66c0f4]"
                          : "bg-gray-500"
                      }`}
                    />
                  </div>

                  <button
                    onClick={() => handleCopyUid(selectedFriend.uid)}
                    className="px-3 py-1.5 rounded bg-[#202d3c] hover:bg-[#2b3c4f] border border-[#2a475e] text-xs font-mono text-[#c7d5e0] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    title="คัดลอก UID ของเพื่อน"
                  >
                    {copiedUid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{selectedFriend.uid}</span>
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-black text-white leading-tight">
                    {selectedFriend.username}
                  </h3>
                  <p
                    className={`text-xs font-semibold mt-0.5 ${
                      selectedFriend.status === "in-game"
                        ? "text-[#a4d007]"
                        : selectedFriend.status === "online"
                        ? "text-[#66c0f4]"
                        : "text-[#8f98a0]"
                    }`}
                  >
                    {selectedFriend.status === "in-game"
                      ? `กำลังเล่น: ${selectedFriend.game_playing || "Anime Battle"}`
                      : selectedFriend.status === "online"
                      ? "ออนไลน์ใน Asparagus"
                      : "ออฟไลน์"}
                  </p>
                </div>

                {/* Bio Card */}
                <div className="p-3.5 rounded bg-[#141d27] border border-[#2a475e]/50 space-y-1">
                  <span className="text-[10px] font-bold text-[#8f98a0] uppercase tracking-wider block">
                    ABOUT / ข้อมูลโปรไฟล์
                  </span>
                  <p className="text-xs text-[#c7d5e0] leading-relaxed">
                    {loadingProfile
                      ? "กำลังโหลดข้อมูลโปรไฟล์..."
                      : selectedProfile?.bio || "ผู้เล่น Asparagus Launcher"}
                  </p>
                </div>

                {/* Showcase Game */}
                <div className="p-3.5 rounded bg-[#141d27] border border-[#2a475e]/50 space-y-2">
                  <span className="text-[10px] font-bold text-[#8f98a0] uppercase tracking-wider block">
                    คลังเกมและกิจกรรม
                  </span>
                  <div className="flex items-center gap-3 p-2.5 rounded bg-[#10141b]/80 border border-[#232f3e]">
                    <img
                      src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80"
                      alt="Anime Battle"
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">Anime Battle</h4>
                      <p className="text-[11px] text-[#66c0f4] flex items-center gap-1 mt-0.5">
                        <Gamepad2 className="w-3 h-3" />
                        <span>เปิดใช้งานในบัญชีแล้ว</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Friends List View */
          <>
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
                  placeholder="เพิ่มเพื่อนด้วย UID (เช่น KE-XXXXXX)"
                  className="flex-1 bg-[#101216] border border-[#2a475e]/60 rounded px-2.5 py-1.5 text-xs text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] uppercase font-mono"
                />
                <button
                  onClick={handleAdd}
                  className="px-3.5 py-1.5 bg-[#2a475e] hover:bg-[#385c79] text-white text-xs font-semibold rounded flex items-center gap-1 cursor-pointer transition-colors shadow"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>เพิ่ม</span>
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
                  placeholder="ค้นหาชื่อเพื่อน, UID, หรือเกมที่กำลังเล่น..."
                  className="w-full bg-[#101216] border border-[#2a475e]/40 rounded px-2.5 py-1.5 pl-7 text-xs text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4]"
                />
                <Search className="w-3.5 h-3.5 text-[#4e5963] absolute left-2 top-2" />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 pt-0.5">
                {[
                  { id: "all", label: "ทั้งหมด" },
                  { id: "in-game", label: "ในเกม" },
                  { id: "online", label: "ออนไลน์" },
                  { id: "offline", label: "ออฟไลน์" },
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
                  <p className="text-xs text-[#8f98a0]">ไม่พบเพื่อนที่ตรงกับ &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-[10px] text-[#4e5963]">ลองค้นหาด้วยชื่อหรือ UID แบบเต็ม</p>
                </div>
              ) : (
                filtered.map((f) => (
                  <div
                    key={f.uid}
                    onClick={() => handleSelectFriend(f)}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#141d27]/60 hover:bg-[#203144] border border-transparent hover:border-[#2a475e]/50 transition-all cursor-pointer group"
                    title="คลิกเพื่อดูโปรไฟล์เพื่อน"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={f.avatar_url || generateDefaultAvatar(f.username)}
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
                          className={`text-xs font-bold truncate group-hover:text-white transition-colors ${
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
                          <p className="text-[10px] text-[#768696] font-mono truncate">
                            {f.status === "online" ? "Online" : "Offline"} | {f.uid}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-[#768696] group-hover:text-[#66c0f4] transition-colors">
                        {f.uid}
                      </span>
                      <span className="text-[10px] text-[#4e5963] group-hover:text-white transition-colors">
                        &rsaquo;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
