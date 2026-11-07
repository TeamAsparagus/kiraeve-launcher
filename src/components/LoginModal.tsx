import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  Minus,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { UserProfile, Friend } from "../types";
import { authService } from "../lib/authService";
import { resizeForLogin, resizeForMainApp } from "../lib/windowManager";

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
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resize window to compact Steam login size on mount or mode change
  useEffect(() => {
    if (fullScreen || isOpen) {
      resizeForLogin(mode === "register");
    }
  }, [mode, fullScreen, isOpen]);

  if (!isOpen && !fullScreen) return null;

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (mode === "register") {
      const cleanUsername = username.trim();
      if (!cleanUsername || cleanUsername.length < 2) {
        setErrorMsg("กรุณากรอกชื่อในเกม (Username) อย่างน้อย 2 ตัวอักษร");
        return;
      }
      if (!validateEmail(cleanEmail)) {
        setErrorMsg("รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกอีเมลจริงของคุณ (เช่น player@gmail.com)");
        return;
      }
      if (cleanPassword.length < 6) {
        setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรสำหรับระบบความปลอดภัย");
        return;
      }
      if (cleanPassword !== confirmPassword.trim()) {
        setErrorMsg("รหัสผ่านยืนยันไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
        return;
      }

      setLoading(true);
      try {
        const result = await authService.register(
          cleanUsername,
          cleanEmail,
          cleanPassword,
          rememberMe
        );
        await resizeForMainApp();
        onLoginSuccess(result);
        onClose?.();
      } catch (err: any) {
        setErrorMsg(err.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
    } else {
      if (!cleanEmail) {
        setErrorMsg("กรุณากรอกชื่อบัญชีหรืออีเมลของคุณ");
        return;
      }
      if (!cleanPassword) {
        setErrorMsg("กรุณากรอกรหัสผ่าน");
        return;
      }

      setLoading(true);
      try {
        const result = await authService.login(cleanEmail, cleanPassword, rememberMe);
        await resizeForMainApp();
        onLoginSuccess(result);
        onClose?.();
      } catch (err: any) {
        setErrorMsg(err.message || "ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMinimize = async () => {
    try {
      await invoke("minimize_window");
    } catch {}
  };

  const handleCloseWindow = async () => {
    try {
      await invoke("close_window");
    } catch {
      onClose?.();
    }
  };

  const modalContent = (
    <div className={`w-full ${fullScreen ? "h-full" : "max-w-[520px] rounded-lg border border-[#2a3444] shadow-2xl"} bg-[#181a21] overflow-hidden flex flex-col select-none`}>
      {/* Caption & Drag Bar */}
      <div
        data-tauri-drag-region
        className="h-9 w-full bg-[#171a21] border-b border-[#232a35] flex items-center justify-between px-3 select-none flex-shrink-0"
      >
        {/* Left: Optional Back Arrow & Brand */}
        <div className="flex items-center gap-2.5">
          {mode === "register" && (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              className="p-1 rounded hover:bg-[#252c38] text-[#8f98a0] hover:text-white transition-colors cursor-pointer"
              title="Back to Sign In"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <img
            src="/logo.png"
            alt="Asparagus Logo"
            className="w-4 h-4 object-contain"
          />
          <span className="font-display font-black text-white text-xs tracking-widest uppercase">
            ASPARAGUS
          </span>
        </div>

        {/* Right: Caption Controls */}
        <div className="flex items-center h-full -mr-3">
          <button
            onClick={handleMinimize}
            className="h-full w-9 flex items-center justify-center text-[#8f98a0] hover:bg-[#252c38] hover:text-white transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCloseWindow}
            className="h-full w-9 flex items-center justify-center text-[#8f98a0] hover:bg-[#e81123] hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto space-y-3">
        <div>
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-2.5 mb-3 rounded bg-red-950/60 border border-red-500/50 flex items-start gap-2 text-xs text-red-200 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmitForm} className="space-y-3">
            {mode === "register" && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1999ff] uppercase tracking-wider block">
                  ACCOUNT NAME (USERNAME)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose an account name"
                  required
                  autoFocus
                  className="w-full bg-[#12161c] border border-[#2a384c] focus:border-[#1999ff] rounded px-3 py-2 text-xs text-white placeholder-[#768696] focus:outline-none transition-colors"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#1999ff] uppercase tracking-wider block">
                {mode === "register" ? "EMAIL ADDRESS (REAL EMAIL)" : "SIGN IN WITH ACCOUNT NAME OR EMAIL"}
              </label>
              <input
                type={mode === "register" ? "email" : "text"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "register" ? "player@example.com" : "Account name or email"}
                required
                autoFocus={mode === "signin"}
                className="w-full bg-[#12161c] border border-[#2a384c] focus:border-[#1999ff] rounded px-3 py-2 text-xs text-white placeholder-[#768696] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#1999ff] uppercase tracking-wider block">
                PASSWORD {mode === "register" && <span className="text-[9px] text-[#8f98a0] font-normal normal-case">(at least 6 characters)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-[#12161c] border border-[#2a384c] focus:border-[#1999ff] rounded px-3 py-2 pr-9 text-xs text-white placeholder-[#768696] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-[#768696] hover:text-[#c7d5e0] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1999ff] uppercase tracking-wider block">
                  CONFIRM PASSWORD
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full bg-[#12161c] border border-[#2a384c] focus:border-[#1999ff] rounded px-3 py-2 text-xs text-white placeholder-[#768696] focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Remember Me Checkbox */}
            {mode === "signin" && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8f98a0] hover:text-white transition-colors pt-0.5">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-[#12161c] border-[#2a384c] text-[#1999ff] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
                <span className="text-xs">Remember me</span>
              </label>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1.5 py-2.5 rounded bg-gradient-to-r from-[#1999ff] to-[#0078d4] hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#1999ff]/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === "register" ? "Creating Account..." : "Signing in..."}</span>
                </>
              ) : (
                <span>{mode === "register" ? "Create Free Account" : "Sign in"}</span>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Footer Area */}
        <div className="pt-3 border-t border-[#232a35] flex items-center justify-between text-[11px] text-[#8f98a0]">
          <a
            href="https://discord.gg/Hh47ZMQsfF"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>Discord Support</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>

          {mode === "signin" ? (
            <div className="text-right">
              <span className="text-[#8f98a0]">Don't have an Asparagus account?</span>{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                }}
                className="text-white hover:underline font-bold cursor-pointer ml-1"
              >
                Create a Free Account
              </button>
            </div>
          ) : (
            <div className="text-right">
              <span className="text-[#8f98a0]">Already have an account?</span>{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMsg(null);
                }}
                className="text-white hover:underline font-bold cursor-pointer ml-1"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="h-screen w-screen bg-[#181a21] text-[#c7d5e0] select-none flex flex-col overflow-hidden">
        {modalContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4 animate-in fade-in">
      {modalContent}
    </div>
  );
};
