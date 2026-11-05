import React from "react";
import {
  MessageSquare,
  ExternalLink,
  Sparkles,
  Gamepad2,
  Bug,
  Users,
  Calendar,
  ShieldCheck,
} from "lucide-react";

export const CommunityPage: React.FC = () => {
  const announcements = [
    {
      id: "ann-1",
      title: "Kiraeve Pilot Alpha Update v0.2.1 Released!",
      date: "November 4, 2026",
      tag: "Patch Notes",
      summary: "Added low-gravity thruster calibration, fixed collision glitches on procedural terrain, and optimized RAM consumption.",
      author: "Lead Creator",
    },
    {
      id: "ann-2",
      title: "How to Purchase Games & Redeem UIDs via Discord",
      date: "November 2, 2026",
      tag: "Guide",
      summary: "To purchase any locked title or get early tester access, join our official Discord server and send your permanent UID to our bot or moderator team.",
      author: "Kiraeve Staff",
    },
    {
      id: "ann-3",
      title: "Community Playtest Night This Friday",
      date: "October 28, 2026",
      tag: "Event",
      summary: "Join the creator and other testers in Discord voice chat for custom multiplayer session tests on Cyber Drift 2088.",
      author: "Community Manager",
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1b2838] select-none text-[#c7d5e0] animate-page-enter">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#2a475e]/40 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[#66c0f4]" />
            <div>
              <h1 className="font-display text-2xl font-black text-white uppercase tracking-wider">
                Community Hub
              </h1>
              <p className="text-xs text-[#8f98a0]">
                Official player community, patch announcements, and direct creator support.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8f98a0]">
            <Sparkles className="w-4 h-4 text-[#ffd700]" />
            <span>Kiraeve Creator Network</span>
          </div>
        </div>

        {/* Discord Massive Hero Banner */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#2c2f38] via-[#1e2330] to-[#5865F2]/20 border border-[#5865F2]/40 shadow-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] font-semibold text-xs uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Official Discord Server</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight">
              สั่งซื้อเกม & พูดคุยกับผู้พัฒนาใน Discord
            </h2>
            <p className="text-xs text-[#b8b6b4] leading-relaxed">
              ต้องการซื้อเกม ปลดล็อกสิทธิ์ด้วย UID แจ้งปัญหาบั๊ก หรือเสนอไอเดียเกมใหม่ เข้าร่วมคอมมูนิตี้ของเราได้โดยตรงที่เซิร์ฟเวอร์ทางการ
            </p>
            <div className="flex items-center gap-4 pt-1 text-xs text-[#8f98a0]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verified UID Sales
              </span>
              <span className="flex items-center gap-1.5">
                <Bug className="w-4 h-4 text-[#66c0f4]" />
                Direct Bug Report
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-2 w-full md:w-auto">
            <a
              href="https://discord.gg/Hh47ZMQsfF"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto px-8 py-4 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl shadow-[#5865F2]/30 hover:scale-105 active:scale-95"
            >
              <MessageSquare className="w-5 h-5" />
              <span>เข้าร่วม Discord (สั่งซื้อที่นี่)</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className="text-[11px] text-[#8f98a0] font-mono">discord.gg/Hh47ZMQsfF</span>
          </div>
        </div>

        {/* 2-Column Section: Creator Announcements & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Announcements Feed (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#66c0f4]" />
                Creator Announcements & Devlogs
              </h3>
            </div>

            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#171d25] border border-[#2a475e]/40 hover:border-[#66c0f4]/50 rounded-lg p-5 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#2a475e]/40 text-[#66c0f4] font-semibold text-[10px] uppercase">
                      {item.tag}
                    </span>
                    <span className="text-[#8f98a0] text-[11px] flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-[#66c0f4] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#8f98a0] leading-relaxed">
                    {item.summary}
                  </p>
                  <div className="pt-2 text-[11px] text-[#5c6873] flex items-center justify-between border-t border-[#2a475e]/20">
                    <span>Posted by {item.author}</span>
                    <a
                      href="https://discord.gg/Hh47ZMQsfF"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#66c0f4] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Discuss on Discord</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Support & Community Guidelines (1 Col) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Community Channels
            </h3>

            <div className="bg-[#171d25] border border-[#2a475e]/40 rounded-lg p-5 space-y-4">
              <div className="space-y-3 text-xs">
                <a
                  href="https://discord.gg/Hh47ZMQsfF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded bg-[#10141a] hover:bg-[#1f2835] border border-[#2a475e]/30 transition-colors"
                >
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>#🛒-order-games</span>
                    <ExternalLink className="w-3 h-3 text-[#5865F2]" />
                  </div>
                  <p className="text-[11px] text-[#8f98a0] mt-1">
                    ส่ง UID และแจ้งสั่งซื้อเกมกับแอดมินโดยตรง
                  </p>
                </a>

                <a
                  href="https://discord.gg/Hh47ZMQsfF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded bg-[#10141a] hover:bg-[#1f2835] border border-[#2a475e]/30 transition-colors"
                >
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>#🐛-bug-reports</span>
                    <ExternalLink className="w-3 h-3 text-red-400" />
                  </div>
                  <p className="text-[11px] text-[#8f98a0] mt-1">
                    รายงานปัญหาเกมหลุด เด้ง หรือข้อผิดพลาด
                  </p>
                </a>

                <a
                  href="https://discord.gg/Hh47ZMQsfF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded bg-[#10141a] hover:bg-[#1f2835] border border-[#2a475e]/30 transition-colors"
                >
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>#💬-general-chat</span>
                    <ExternalLink className="w-3 h-3 text-[#66c0f4]" />
                  </div>
                  <p className="text-[11px] text-[#8f98a0] mt-1">
                    พูดคุยและนัดเล่นเกมกับเพื่อนในคอมมูนิตี้
                  </p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
