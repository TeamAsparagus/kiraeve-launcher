import React, { useState } from "react";
import {
  Folder,
  Save,
  Database,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
  Shield,
  Sliders,
  Cloud,
  RefreshCw,
  AlertCircle,
  Key,
  Github,
  Lock,
} from "lucide-react";
import { LauncherSettings, UserProfile } from "../types";
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
} from "../lib/supabase";

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
  const [autoUpdate, setAutoUpdate] = useState(settings.autoUpdate);
  const [githubToken, setGithubToken] = useState(settings.githubToken || "");
  const [saved, setSaved] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Supabase Runtime Connection Configuration
  const initialConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialConfig.anonKey);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleSave = () => {
    onSave({
      installPath,
      autoUpdate,
      enableDiscordRPC: false,
      githubToken: githubToken.trim(),
    });
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleTestSupabase = async () => {
    setTestingConnection(true);
    setConnectionFeedback(null);
    try {
      const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      setConnectionFeedback(result);
      if (result.ok) {
        saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
      }
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1b2838] select-none text-[#c7d5e0]">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a475e]/40 pb-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-[#66c0f4]" />
            <div>
              <h1 className="font-display text-2xl font-black text-white uppercase tracking-wider">
                Launcher Settings
              </h1>
              <p className="text-xs text-[#8f98a0]">
                Configure GitHub Private Releases and Supabase Cloud.
              </p>
            </div>
          </div>
        </div>

        {/* Account & UID Card (Critical for Discord Purchases) */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <Shield className="w-4 h-4 text-[#66c0f4]" />
              <span>Your Permanent Account UID</span>
            </div>
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded ${
                isSupabaseConfigured()
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                  : "bg-[#2a475e]/40 text-[#a4d007]"
              }`}
            >
              {isSupabaseConfigured() ? "Cloud Connected" : "Local Database Mode"}
            </span>
          </div>

          <p className="text-xs text-[#8f98a0]">
            ใช้รหัส UID ด้านล่างนี้ส่งให้แอดมินใน Discord เพื่อปลดล็อกสิทธิ์เกมเข้าบัญชีของคุณโดยตรง
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e131a] p-4 rounded-lg border border-[#2a475e]/40">
            <div>
              <span className="text-[10px] uppercase text-[#5c6873] font-bold block">
                Active Player UID
              </span>
              <span className="font-mono text-lg font-black text-[#66c0f4] tracking-wider">
                {user?.uid || "Not Signed In"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {user?.uid && (
                <button
                  onClick={handleCopyUid}
                  className="px-4 py-2 rounded bg-[#2a475e] hover:bg-[#385c79] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedUid ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#a4d007]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy UID</span>
                    </>
                  )}
                </button>
              )}

              <a
                href="https://discord.gg/Hh47ZMQsfF"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send in Discord</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Item B: GitHub Private Releases Storage Configuration */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <Github className="w-4 h-4 text-[#66c0f4]" />
              <span>GitHub Private Releases (Game Build Downloader)</span>
            </div>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#66c0f4] hover:underline flex items-center gap-1"
            >
              <span>Generate GitHub Token</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed">
            ระบุ GitHub Personal Access Token (PAT) ที่มีสิทธิ์เข้าถึง Private Repository ของเกม ตัว Launcher จะใช้ Token นี้ดาวน์โหลดและแตกไฟล์ `.zip` จาก GitHub Release ลงเครื่องอัตโนมัติ
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-[#8f98a0] uppercase tracking-wider block mb-1">
                GitHub Personal Access Token (PAT)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx หรือ github_pat_xxxxxxxxxxxx"
                  className="w-full bg-[#0e131a] border border-[#2a475e]/60 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
                />
                <Lock className="w-3.5 h-3.5 text-[#4e5963] absolute right-3.5 top-2.5" />
              </div>
              <span className="text-[10px] text-[#5c6873] block mt-1">
                สร้างได้ที่ GitHub Settings &rarr; Developer Settings &rarr; Personal Access Tokens (ต้องการสิทธิ์: <code className="text-[#8f98a0]">repo</code> หรือ <code className="text-[#8f98a0]">Contents: Read</code>)
              </span>
            </div>
          </div>
        </div>

        {/* Supabase Cloud Connection Setting */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <Cloud className="w-4 h-4 text-[#66c0f4]" />
              <span>Supabase Cloud Database Connection</span>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#66c0f4] hover:underline flex items-center gap-1"
            >
              <span>Supabase Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-[#8f98a0] uppercase tracking-wider block mb-1">
                Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-[#0e131a] border border-[#2a475e]/60 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#8f98a0] uppercase tracking-wider block mb-1">
                Anon Public Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-[#0e131a] border border-[#2a475e]/60 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
                />
                <Key className="w-3.5 h-3.5 text-[#4e5963] absolute right-3.5 top-2.5" />
              </div>
            </div>

            {/* Test Connection Button & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={testingConnection || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
                className="px-4 py-2 rounded bg-[#2a475e] hover:bg-[#385c79] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testingConnection ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-[#66c0f4]" />
                )}
                <span>{testingConnection ? "กำลังทดสอบการเชื่อมต่อ..." : "ทดสอบการเชื่อมต่อ (Test Connection)"}</span>
              </button>

              <span className="text-[11px] text-[#5c6873]">
                SQL Schema: <code className="text-[#8f98a0]">supabase/schema.sql</code>
              </span>
            </div>

            {connectionFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  connectionFeedback.ok
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/40 border-red-500/40 text-red-300"
                }`}
              >
                {connectionFeedback.ok ? (
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span>{connectionFeedback.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Directory Setting */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Folder className="w-4 h-4 text-[#66c0f4]" />
            <span>Game Library Installation Folder</span>
          </div>
          <p className="text-xs text-[#8f98a0]">
            โฟลเดอร์หลักที่ใช้เก็บไฟล์เกมที่ดาวน์โหลดและแตกไฟล์ทั้งหมด
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={installPath}
              onChange={(e) => setInstallPath(e.target.value)}
              className="flex-1 bg-[#0e131a] border border-[#2a475e]/60 rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
              placeholder="Default: %LOCALAPPDATA%\KiraeveLauncher\games"
            />
          </div>
        </div>

        {/* Preferences & Toggles */}
        <div className="bg-[#141d27] border border-[#2a475e]/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Database className="w-4 h-4 text-[#66c0f4]" />
            <span>Client Preferences</span>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between p-3 rounded-lg bg-[#0e131a] border border-[#2a475e]/30 cursor-pointer hover:border-[#2a475e]">
              <div>
                <div className="text-xs font-bold text-white">
                  Automatic Game Updates
                </div>
                <div className="text-[11px] text-[#8f98a0]">
                  ดาวน์โหลดแพตช์ล่าสุดจาก GitHub Release อัตโนมัติเมื่อเปิดโปรแกรม
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="w-4 h-4 accent-[#1a9fff] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded bg-gradient-to-r from-[#47bfff] to-[#1a9fff] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#1a9fff]/20"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-black" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
