import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  Shield,
  Lock,
  Mail,
  Gamepad2,
  AlertCircle,
  UserPlus,
  LogIn,
  MessageSquare,
  ExternalLink,
  Minus,
  Square,
  CheckCircle2,
  Sparkles,
  User,
} from "lucide-react";
import { UserProfile, Friend } from "../types";
import { authService } from "../lib/authService";

export interface AuthSessionPayload {
  user: UserProfile;
  unlockedGameIds: string[];
  installedGameIds: string[];
  friends: Friend[];
}

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (session: AuthSessionPayload) => void;
  fullScreen?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  fullScreen = false,
}) => {
  const [mode, setMode] = useState<"signin" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen && !fullScreen) return null;

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const result = await authService.register(
          username,
          email,
          password,
          rememberMe
        );
        onLoginSuccess(result);
        onClose?.();
      } else {
        const result = await authService.login(email, password, rememberMe);
        onLoginSuccess(result);
        onClose?.();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  const handleMinimize = async () => {
    try {
      await invoke("minimize_window");
    } catch {}
  };

  const handleMaximize = async () => {
    try {
      await invoke("toggle_maximize_window");
    } catch {}
  };

  const handleCloseWindow = async () => {
    try {
      await invoke("close_window");
    } catch {}
  };

  return (
    <div
      className={`${
        fullScreen
          ? "h-screen w-screen flex flex-col bg-[#12171e] select-none overflow-hidden"
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
      }`}
    >
      {/* Top Window Bar when in Full-Screen Launcher Gate Mode */}
      {fullScreen && (
        <div
          data-tauri-drag-region
          className="h-8 w-full bg-[#10141a] border-b border-[#212b38] flex items-center justify-between pl-4 flex-shrink-0"
        >
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#8f98a0]">
            <Gamepad2 className="w-4 h-4 text-[#66c0f4]" />
            <span>KIRAEVE CLIENT AUTHENTICATION</span>
          </div>
          <div className="flex items-center h-full">
            <button
              onClick={handleMinimize}
              className="h-full w-11 flex items-center justify-center text-[#8f98a0] hover:bg-[#212b38] hover:text-white transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="h-full w-11 flex items-center justify-center text-[#8f98a0] hover:bg-[#212b38] hover:text-white transition-colors cursor-pointer"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleCloseWindow}
              className="h-full w-11 flex items-center justify-center text-[#8f98a0] hover:bg-[#e81123] hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Centered Login Wrapper */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-y-auto">
        {fullScreen && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1b2838] via-[#12171e] to-[#0b0e13] pointer-events-none" />
        )}

        <div className="relative z-10 w-full max-w-3xl bg-[#181c24] border border-[#2a475e]/60 rounded-xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-5 animate-page-enter">
          {/* Left 3 Columns: Real Account Registration & Login */}
          <div className="md:col-span-3 p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#1a9fff]/15 border border-[#1a9fff]/40 text-[#66c0f4]">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-black text-white tracking-wider uppercase">
                    {mode === "signin" ? "Sign in to Kiraeve" : "Create New Account"}
                  </h1>
                  <p className="text-[11px] text-[#8f98a0]">
                    {mode === "signin"
                      ? "เข้าสู่ระบบด้วยบัญชีที่คุณสมัครไว้เพื่อซิงก์รหัส UID ถาวร"
                      : "สร้างบัญชีผู้ใช้งานจริงเพื่อรับรหัส Permanent UID ประจำตัว"}
                  </p>
                </div>
              </div>
              {!fullScreen && onClose && (
                <button
                  onClick={onClose}
                  className="text-[#8f98a0] hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#101319] rounded-lg border border-[#2a475e]/30">
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === "register"
                    ? "bg-[#2a475e] text-white shadow"
                    : "text-[#8f98a0] hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>สมัครสมาชิกใหม่ (Register)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === "signin"
                    ? "bg-[#2a475e] text-white shadow"
                    : "text-[#8f98a0] hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ (Sign In)</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="text-[11px] font-bold text-[#66c0f4] uppercase tracking-wider block mb-1.5">
                    Display Name (ชื่อผู้เล่น)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="เช่น KiraPlayer"
                      className="w-full bg-[#101319] border border-[#2a475e]/60 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
                    />
                    <User className="w-3.5 h-3.5 text-[#4e5963] absolute right-3.5 top-3" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#66c0f4] uppercase tracking-wider block mb-1.5">
                  {mode === "signin"
                    ? "Email / Username / UID"
                    : "Email Address"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      mode === "signin"
                        ? "กรอกชื่อผู้ใช้, อีเมล หรือรหัส KE-XXXXXX"
                        : "กรอกอีเมลของคุณ เช่น you@example.com"
                    }
                    className="w-full bg-[#101319] border border-[#2a475e]/60 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#4e5963] absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8f98a0] uppercase tracking-wider block mb-1.5">
                  Password (อย่างน้อย 4 ตัวอักษร)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#101319] border border-[#2a475e]/60 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#4e5963] absolute right-3.5 top-3" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#8f98a0]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#1a9fff] rounded cursor-pointer"
                  />
                  <span>จดจำการเข้าสู่ระบบในเครื่องนี้ (Remember session)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-[#47bfff] to-[#1a9fff] hover:brightness-110 text-black font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#1a9fff]/25 cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {loading
                  ? "กำลังตรวจสอบข้อมูล..."
                  : mode === "signin"
                  ? "Sign In (เข้าสู่ระบบ)"
                  : "Create Account (สมัครสมาชิก & รับ UID)"}
              </button>
            </form>
          </div>

          {/* Right 2 Columns: Steam-style UID & Discord Onboarding Panel */}
          <div className="md:col-span-2 bg-[#13171f] border-t md:border-t-0 md:border-l border-[#2a475e]/40 p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2a475e]/40 text-[#66c0f4] text-[10px] font-mono uppercase font-bold">
                <Sparkles className="w-3 h-3 text-[#ffd700]" />
                <span>Account & UID System</span>
              </div>

              <h3 className="text-base font-black text-white uppercase tracking-wide leading-snug">
                ระบบบัญชีถาวรและรหัส UID
              </h3>

              <ul className="space-y-3 text-xs text-[#8f98a0]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#a4d007] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">ข้อมูลบันทึกจริง:</strong> บัญชีที่สมัคร รหัสผ่าน รหัส UID รูปโปรไฟล์ และเกมที่ปลดล็อกจะถูกบันทึกถาวรในฐานข้อมูล
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#a4d007] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">UID เฉพาะบุคคล:</strong> ล็อกอินกี่ครั้งก็ได้รหัส UID เดิมเสมอ และแอดเพื่อนข้ามบัญชีด้วยรหัส UID ได้จริง
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#a4d007] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">ซื้อเกมผ่าน Discord:</strong> แจ้ง UID ของคุณในเซิร์ฟเวอร์ Discord เพื่อรับคีย์ปลดล็อกเกม
                  </span>
                </li>
              </ul>
            </div>

            {/* Discord Box */}
            <div className="p-4 rounded-lg bg-[#1a202c] border border-[#5865F2]/40 space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#5865F2]" />
                <span>Official Kiraeve Discord</span>
              </div>
              <p className="text-[11px] text-[#8f98a0] leading-relaxed">
                ติดต่อซื้อเกม ขอรับคีย์ หรือแจ้งปัญหาการใช้งานกับผู้พัฒนาโดยตรง
              </p>
              <a
                href="https://discord.gg/Hh47ZMQsfF"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#c7d5e0] hover:text-white border border-[#5865F2]/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>เข้าร่วม Discord</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[#5c6873] font-mono">
              <Shield className="w-3.5 h-3.5 text-[#66c0f4]" />
              <span>Persistent Account & Entitlement DB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
