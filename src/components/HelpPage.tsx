import React, { useState } from "react";
import {
  HelpCircle,
  Search,
  HardDrive,
  User,
  Key,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { UserProfile } from "../types";

interface HelpPageProps {
  user: UserProfile | null;
  onOpenRedeemKey: () => void;
  onOpenSettings: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  user,
  onOpenRedeemKey,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqItems = [
    {
      q: "เกมไม่เริ่มทำงานหลังจากกด PLAY (Game won't launch)?",
      a: "ตรวจสอบว่าเครื่องของคุณมี Microsoft Visual C++ Redistributable และการ์ดจออัปเดตไดรเวอร์ล่าสุด หรือลองเปลี่ยน Install Path ในหน้า Settings ไปยังไดรฟ์ที่ไม่มีการจำกัดสิทธิ์",
    },
    {
      q: "วิธีปลดล็อกเกมด้วยรหัสผลิตภัณฑ์ (Product Key)?",
      a: "ไปที่เมนูด้านบน Games -> Activate a Product on Kiraeve หรือคลิกปุ่ม 'Redeem Product Key' ด้านล่างเพื่อกรอกรหัส",
    },
    {
      q: "Permanent UID คืออะไร และใช้งานอย่างไร?",
      a: "Permanent UID (เช่น KE-8F3A2B) เป็นรหัสประจำตัวถาวรของคุณที่ผูกกับบัญชี Supabase ใช้สำหรับให้ผู้สร้างเกม (Admin) ปลดล็อกสิทธิ์การเข้าถึงเกมให้คุณโดยตรง",
    },
    {
      q: "ไฟล์เซฟของเกมอยู่ที่ไหนหลังจากการอัปเดต?",
      a: "ระบบอัปเดตของ Kiraeve Launcher ใช้การแตกไฟล์ทับโฟลเดอร์เดิม (Overwrite) ทำให้ไฟล์เซฟและคอนฟิกที่เก็บไว้ไม่สูญหาย",
    },
  ];

  const filteredFaqs = faqItems.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1b2838] select-none text-[#c7d5e0] animate-page-enter">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Steam Support Header */}
        <div className="space-y-4 border-b border-[#2a475e]/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#2a475e]/40 text-[#66c0f4] border border-[#66c0f4]/20 shadow-md">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white tracking-wider uppercase">
                Kiraeve Support
              </h1>
              <p className="text-xs text-[#8f98a0]">
                What do you need help with today?
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics, FAQs, and error codes..."
              className="w-full bg-[#121922] border border-[#2a475e]/60 rounded-lg px-4 py-3 pl-11 text-xs text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-[#4e5963] absolute left-4 top-5.5" />
          </div>
        </div>

        {/* Quick Action Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={onOpenRedeemKey}
            className="p-4 rounded-lg bg-[#141d27] border border-[#2a475e]/40 hover:border-[#1a9fff] hover:bg-[#1b2838] transition-all cursor-pointer flex items-center justify-between group shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2 rounded bg-[#2a475e]/30 text-[#a4d007] group-hover:scale-110 transition-transform">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-[#66c0f4] transition-colors">
                  Activate a Game or Code
                </h3>
                <p className="text-[11px] text-[#8f98a0]">
                  Redeem product activation keys
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#4e5963] group-hover:text-white transition-colors" />
          </div>

          <div
            onClick={onOpenSettings}
            className="p-4 rounded-lg bg-[#141d27] border border-[#2a475e]/40 hover:border-[#1a9fff] hover:bg-[#1b2838] transition-all cursor-pointer flex items-center justify-between group shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2 rounded bg-[#2a475e]/30 text-[#66c0f4] group-hover:scale-110 transition-transform">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-[#66c0f4] transition-colors">
                  Downloads & Installation Path
                </h3>
                <p className="text-[11px] text-[#8f98a0]">
                  Configure disk folder and updates
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#4e5963] group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Account & UID Diagnostics */}
        <div className="bg-[#141d27] p-5 rounded-lg border border-[#2a475e]/40 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-[#2a475e]/30 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-white">
              <User className="w-4 h-4 text-[#66c0f4]" />
              <span>Account Diagnostics & Entitlements</span>
            </div>
            {user ? (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#a4d007]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Authenticated</span>
              </span>
            ) : (
              <span className="text-[11px] text-red-400 font-mono">Not Signed In</span>
            )}
          </div>

          {user ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono pt-1">
              <div>
                <span className="text-[10px] text-[#4e5963] uppercase block">Username</span>
                <span className="text-white font-bold">{user.username}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#4e5963] uppercase block">Permanent UID</span>
                <span className="text-[#66c0f4] font-bold">{user.uid}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#4e5963] uppercase block">Security Role</span>
                <span className="text-[#a4d007]">Verified Player</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#8f98a0]">
              Sign in with your email account to verify your game entitlements.
            </p>
          )}
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Frequently Asked Questions
          </h2>

          <div className="space-y-2.5">
            {filteredFaqs.map((faq, idx) => (
              <div
                key={idx}
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="bg-[#141d27] border border-[#2a475e]/30 hover:border-[#2a475e] rounded-lg p-4 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white pr-4">
                    {faq.q}
                  </h3>
                  <ChevronRight
                    className={`w-4 h-4 text-[#66c0f4] flex-shrink-0 transition-transform duration-200 ${
                      expandedFaq === idx ? "rotate-90" : ""
                    }`}
                  />
                </div>
                {expandedFaq === idx && (
                  <p className="text-xs text-[#8f98a0] mt-3 pt-3 border-t border-[#2a475e]/20 leading-relaxed animate-in fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
