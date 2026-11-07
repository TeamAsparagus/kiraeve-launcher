import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Folder,
  FolderOpen,
  Save,
  Copy,
  Check,
  Sliders,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Info,
} from "lucide-react";
import { LauncherSettings, UserProfile } from "../types";

interface SettingsProps {
  settings: LauncherSettings;
  user: UserProfile | null;
  onSave: (newSettings: LauncherSettings) => void;
}

export const SettingsModal: React.FC<SettingsProps> = ({
  settings,
  user,
  onSave,
}) => {
  const [installPath, setInstallPath] = useState(settings.installPath);
  const [autoUpdate, setAutoUpdate] = useState(settings.autoUpdate ?? false);
  const [saved, setSaved] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [selectingFolder, setSelectingFolder] = useState(false);

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleBrowseFolder = async () => {
    setSelectingFolder(true);
    try {
      const selected = await invoke<string | null>("select_install_folder");
      if (selected) {
        setInstallPath(selected);
      }
    } catch (err) {
      console.warn("Folder picker error:", err);
    } finally {
      setSelectingFolder(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...settings,
      installPath: installPath.trim(),
      autoUpdate,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1b2838] select-none text-[#c7d5e0]">
      <div className="max-w-3xl mx-auto p-8 space-y-8 animate-page-enter">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a475e]/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#1a9fff]/15 border border-[#1a9fff]/40 text-[#66c0f4]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white uppercase tracking-wider">
                Settings
              </h1>
              <p className="text-xs text-[#8f98a0]">
                ตั้งค่าโฟลเดอร์ติดตั้งเกมและระบบอัปเดตของเครื่องคุณ
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded bg-gradient-to-r from-[#1a9fff] to-[#0078d4] hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#1a9fff]/20 cursor-pointer"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>บันทึกแล้ว!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </>
            )}
          </button>
        </div>

        {/* Section 1: Permanent UID Account Card */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Permanent Player UID
              </h2>
            </div>
            <span className="text-[10px] uppercase font-bold text-[#66c0f4] px-2 py-0.5 rounded bg-[#1a9fff]/10 border border-[#1a9fff]/30">
              Verified Account
            </span>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed">
            รหัสประจำตัวถาวรของคุณสำหรับรับการปลดล็อกเกม เพิ่มเพื่อน และแจ้งสั่งซื้อเกมผ่าน Discord
          </p>

          <div className="flex items-center gap-3 bg-[#0d1217] p-3 rounded-lg border border-[#2a475e]/40">
            <div className="flex-1 font-mono text-base font-bold text-white tracking-widest">
              {user?.uid || "Not Logged In"}
            </div>
            <button
              onClick={handleCopyUid}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#202f40] hover:bg-[#2b3e54] text-[#c7d5e0] hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#2a475e]/60"
              title="คัดลอก UID"
            >
              {copiedUid ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#66c0f4]" />
                  <span>คัดลอก UID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 2: Game Library Storage Location */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#66c0f4]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Game Library Directory
            </h2>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed">
            เลือกตำแหน่งโฟลเดอร์ในคอมพิวเตอร์ที่ต้องการใช้เก็บและติดตั้งไฟล์ตัวเกมทั้งหมด
          </p>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={installPath}
                onChange={(e) => setInstallPath(e.target.value)}
                placeholder="C:\Users\...\AppData\Local\Asparagus\games"
                className="w-full bg-[#0d1217] border border-[#2a475e]/60 rounded-lg px-3.5 py-2.5 pl-10 text-xs font-mono text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
              />
              <Folder className="w-4 h-4 text-[#4e5963] absolute left-3.5 top-3" />
            </div>

            <button
              onClick={handleBrowseFolder}
              disabled={selectingFolder}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#202f40] hover:bg-[#2b3e54] text-white text-xs font-bold transition-all cursor-pointer border border-[#2a475e] shadow flex-shrink-0 disabled:opacity-50"
            >
              <FolderOpen className="w-4 h-4 text-[#66c0f4]" />
              <span>{selectingFolder ? "กำลังเปิด..." : "กดเลือกโฟลเดอร์..."}</span>
            </button>
          </div>
        </div>

        {/* Section 3: Game Update Mode (Manual vs Auto) */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-[#1a9fff]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Game Updates Mode
            </h2>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed">
            เลือกรูปแบบการอัปเดตไฟล์เกมเมื่อมี Patch ใหม่จากผู้พัฒนา
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Manual Update Option (Default) */}
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                !autoUpdate
                  ? "bg-[#1b2b3a] border-[#1a9fff] shadow-md shadow-[#1a9fff]/10"
                  : "bg-[#0d1217] border-[#2a475e]/40 hover:border-[#2a475e] opacity-75 hover:opacity-100"
              }`}
            >
              <input
                type="radio"
                name="updateMode"
                checked={!autoUpdate}
                onChange={() => setAutoUpdate(false)}
                className="mt-0.5 accent-[#1a9fff]"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">อัปเดตเอง (Manual)</span>
                  <span className="text-[9px] uppercase font-bold text-[#a4d007] px-1.5 py-0.2 rounded bg-[#a4d007]/10 border border-[#a4d007]/30">
                    ค่าเริ่มต้น (Default)
                  </span>
                </div>
                <p className="text-[11px] text-[#8f98a0] leading-relaxed">
                  เมื่อมี Patch ใหม่ ตัวเกมจะขึ้นปุ่ม UPDATE ให้คุณกดดาวน์โหลดเมื่อพร้อม ไม่เปลืองแบนด์วิดท์ขณะกำลังเล่น
                </p>
              </div>
            </label>

            {/* Auto Update Option */}
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                autoUpdate
                  ? "bg-[#1b2b3a] border-[#1a9fff] shadow-md shadow-[#1a9fff]/10"
                  : "bg-[#0d1217] border-[#2a475e]/40 hover:border-[#2a475e] opacity-75 hover:opacity-100"
              }`}
            >
              <input
                type="radio"
                name="updateMode"
                checked={autoUpdate}
                onChange={() => setAutoUpdate(true)}
                className="mt-0.5 accent-[#1a9fff]"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">อัปเดตอัตโนมัติ (Auto)</span>
                </div>
                <p className="text-[11px] text-[#8f98a0] leading-relaxed">
                  ดาวน์โหลดและซิงก์ Differential Patch จาก Cloud เบื้องหลังทันทีที่เปิดแอป ให้เกมพร้อมเล่นตลอดเวลา
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Helpful Footer Note */}
        <div className="flex items-center gap-2 text-[11px] text-[#55677d] px-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>การเปลี่ยนแปลงการตั้งค่าจะมีผลทันทีหลังจากกดปุ่ม &ldquo;บันทึกการตั้งค่า&rdquo;</span>
        </div>
      </div>
    </div>
  );
};
