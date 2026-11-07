import React, { useState } from "react";
import {
  Calendar,
  MessageSquare,
  ExternalLink,
  ArrowUpCircle,
  Filter,
} from "lucide-react";

interface PatchNoteItem {
  id: string;
  version: string;
  title: string;
  date: string;
  type: "new-game" | "game-patch" | "launcher";
  gameTitle?: string;
  bannerUrl?: string;
  highlights: string[];
}

const PATCH_NOTES_DATA: PatchNoteItem[] = [
  {
    id: "patch-1",
    version: "v1.0.0",
    title: "เปิดตัวเกมใหม่: Anime Battle เข้าสู่คลังเกมทางการ!",
    date: "7 พฤศจิกายน 2026",
    type: "new-game",
    gameTitle: "Anime Battle",
    bannerUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1400&q=80",
    highlights: [
      "เพิ่มเกมใหม่ 3D Anime Arena Fighter เข้าสู่ร้านค้า Asparagus Store",
      "ระบบ Cloudflare R2 Differential CDN ดาวน์โหลดเฉพาะไฟล์ที่เปลี่ยนแปลง รวดเร็วทันใจ",
      "ระบบรักษาความปลอดภัย Asparagus Launcher Engine ป้องกันการแก้ไขไฟล์เกมภายนอก",
      "รองรับการเล่นแบบ Real-time Arena Combat และสกิลท่าไม้ตาย Ultimate Combo",
    ],
  },
  {
    id: "patch-2",
    version: "v1.0.3",
    title: "อัปเดตระบบ Asparagus Launcher: ระบบเพื่อนสองทาง, เมนูโปรไฟล์เพื่อน และคลาวด์ซิงก์",
    date: "7 พฤศจิกายน 2026",
    type: "launcher",
    highlights: [
      "หน้าต่าง Compact Login สไตล์ Steam แบบกะทัดรัด พร้อมขยายสู่หน้าจอหลักอัตโนมัติ",
      "ระบบดูโปรไฟล์เพื่อน (Friend Profile Viewer): ตรวจสอบเลเวล, สถานะเกม, และ Bio ของเพื่อนได้ทันที",
      "ปรับปรุงระบบ Add Friend: เพิ่มเพื่อนแบบสองทาง (Mutual Friendship) เห็นสถานะกันและกันทันที",
      "ระบบ Settings ใหม่: สามารถกด Browse เลือกตำแหน่งโฟลเดอร์สำหรับติดตั้งเกมได้อิสระ",
      "เชื่อมต่อระบบอัปเดตตัวแอป Launcher ผ่าน Cloudflare R2 โดยตรง ป้องกันปัญหา Server Error",
    ],
  },
];

export const CommunityPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<"all" | "new-game" | "game-patch" | "launcher">("all");

  const filteredNotes = PATCH_NOTES_DATA.filter((item) => {
    if (activeFilter === "all") return true;
    return item.type === activeFilter;
  });

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1b2838] select-none text-[#c7d5e0] animate-page-enter">
      <div className="max-w-5xl mx-auto p-8 space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a475e]/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#1a9fff]/15 border border-[#1a9fff]/40 text-[#66c0f4]">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white uppercase tracking-wider">
                Patch Notes & Changelog
              </h1>
              <p className="text-xs text-[#8f98a0]">
                บันทึกการอัปเดตเวอร์ชัน รายการเพิ่มเกมใหม่ และการปรับปรุงระบบทั้งหมด
              </p>
            </div>
          </div>

          {/* Discord CTA */}
          <a
            href="https://discord.gg/Hh47ZMQsfF"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#5865F2]/25 cursor-pointer self-start md:self-auto hover:scale-105"
          >
            <MessageSquare className="w-4 h-4" />
            <span>ติดต่อ / แจ้งปัญหาใน Discord</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-3.5 h-3.5 text-[#8f98a0] mr-1 flex-shrink-0" />
          {[
            { id: "all", label: "ทั้งหมด (All Updates)" },
            { id: "new-game", label: "เกมใหม่ (New Games)" },
            { id: "game-patch", label: "อัปเดตเกม (Game Patches)" },
            { id: "launcher", label: "อัปเดต Launcher" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? "bg-[#1a9fff] text-white shadow-md shadow-[#1a9fff]/20"
                  : "bg-[#141d27] text-[#8f98a0] hover:text-white border border-[#2a475e]/40 hover:border-[#2a475e]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline List of Patch Notes */}
        <div className="space-y-6">
          {filteredNotes.map((note) => {
            const isNewGame = note.type === "new-game";
            const isLauncher = note.type === "launcher";

            return (
              <article
                key={note.id}
                className={`bg-[#141d27] border rounded-xl overflow-hidden shadow-xl transition-all ${
                  isNewGame
                    ? "border-[#1a9fff]/60 shadow-lg shadow-[#1a9fff]/10"
                    : isLauncher
                    ? "border-emerald-500/40"
                    : "border-[#2a475e]/50"
                }`}
              >
                {/* Optional Banner for Game Releases/Patches */}
                {note.bannerUrl && (
                  <div className="relative w-full h-44 overflow-hidden bg-black">
                    <img
                      src={note.bannerUrl}
                      alt={note.title}
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141d27] via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-[#66c0f4] border border-[#1a9fff]/40">
                        {note.gameTitle}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2a475e]/30 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-black ${
                          isNewGame
                            ? "bg-[#1a9fff]/20 text-[#66c0f4] border border-[#1a9fff]/40"
                            : isLauncher
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/40"
                            : "bg-[#202f40] text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {note.version}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1b2838] text-[#8f98a0]">
                        {isNewGame ? "NEW GAME RELEASE" : isLauncher ? "LAUNCHER SYSTEM" : "GAME PATCH"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#8f98a0]">
                      <Calendar className="w-3.5 h-3.5 text-[#4e5963]" />
                      <span>{note.date}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-white leading-snug">
                    {note.title}
                  </h2>

                  {/* Highlights Bullet List */}
                  <ul className="space-y-2 text-xs text-[#c7d5e0] leading-relaxed pt-1">
                    {note.highlights.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1a9fff] mt-1.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
