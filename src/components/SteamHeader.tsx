import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronDown,
  Settings as SettingsIcon,
  Minus,
  Square,
  X,
  LogIn,
  Key,
  Users,
  HelpCircle,
  FolderOpen,
  LogOut,
  Shield,
  User,
  ShoppingBag,
  Library,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { UserProfile } from "../types";
import { generateDefaultAvatar } from "../lib/authService";

interface SteamHeaderProps {
  activeTab: "library" | "store" | "community" | "profile" | "settings" | "help";
  setActiveTab: (tab: "library" | "store" | "community" | "profile" | "settings" | "help") => void;
  user: UserProfile | null;
  onOpenLogin: () => void;
  onOpenFriends: () => void;
  onOpenRedeemKey: () => void;
  onOpenUpdateModal?: () => void;
  onLogout: () => void;
}

export const SteamHeader: React.FC<SteamHeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenLogin,
  onOpenFriends,
  onOpenRedeemKey,
  onOpenUpdateModal,
  onLogout,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (menuName: string) => {
    setOpenDropdown(openDropdown === menuName ? null : menuName);
  };

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
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

  const handleClose = async () => {
    try {
      await invoke("close_window");
    } catch {}
  };

  return (
    <header
      ref={headerRef}
      data-tauri-drag-region
      className="w-full bg-[#171d25] border-b border-[#212b38] flex flex-col justify-between select-none z-40 flex-shrink-0"
    >
      {/* Row 1: Window Caption Bar with Menu & Window Controls */}
      <div className="h-7 w-full flex items-center justify-between px-2 text-[12px] text-[#8f98a0] bg-[#12171e]">
        {/* Left Menu Items */}
        <div className="flex items-center gap-0.5 relative text-[#b8b6b4]">
          {/* Kiraeve Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("kiraeve")}
              className={`px-2.5 py-0.5 text-xs font-medium rounded hover:bg-[#212b38] hover:text-white transition-colors cursor-pointer ${
                openDropdown === "kiraeve" ? "bg-[#212b38] text-white" : ""
              }`}
            >
              Kiraeve
            </button>
            {openDropdown === "kiraeve" && (
              <div className="absolute left-0 top-7 w-56 bg-[#1a232f] border border-[#2b3a4c] rounded shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab("profile");
                        setOpenDropdown(null);
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#66c0f4]" />
                      <span>View Profile ({user.username})</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setOpenDropdown(null);
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      <span>Settings</span>
                    </button>
                    {onOpenUpdateModal && (
                      <button
                        onClick={() => {
                          onOpenUpdateModal();
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#1a9fff]" />
                        <span>Check for Kiraeve Updates...</span>
                      </button>
                    )}
                    <div className="border-t border-[#263445] my-1" />
                    <button
                      onClick={() => {
                        onLogout();
                        setOpenDropdown(null);
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-[#e81123]/20 text-red-300 hover:text-red-200 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out of Account...</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onOpenLogin();
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#66c0f4]" />
                    <span>Sign In to Kiraeve...</span>
                  </button>
                )}
                <div className="border-t border-[#263445] my-1" />
                <button
                  onClick={() => {
                    handleClose();
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white cursor-pointer"
                >
                  Exit Kiraeve Launcher
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("view")}
              className={`px-2.5 py-0.5 text-xs font-medium rounded hover:bg-[#212b38] hover:text-white transition-colors cursor-pointer ${
                openDropdown === "view" ? "bg-[#212b38] text-white" : ""
              }`}
            >
              View
            </button>
            {openDropdown === "view" && (
              <div className="absolute left-0 top-7 w-48 bg-[#1a232f] border border-[#2b3a4c] rounded shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setActiveTab("library");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Library className="w-3.5 h-3.5 text-[#1a9fff]" />
                  <span>Library</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("store");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#66c0f4]" />
                  <span>Store</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("community");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#a4d007]" />
                  <span>Community</span>
                </button>
              </div>
            )}
          </div>

          {/* Friends Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("friends")}
              className={`px-2.5 py-0.5 text-xs font-medium rounded hover:bg-[#212b38] hover:text-white transition-colors cursor-pointer ${
                openDropdown === "friends" ? "bg-[#212b38] text-white" : ""
              }`}
            >
              Friends
            </button>
            {openDropdown === "friends" && (
              <div className="absolute left-0 top-7 w-52 bg-[#1a232f] border border-[#2b3a4c] rounded shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onOpenFriends();
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#66c0f4]" />
                  <span>View Friends List</span>
                </button>
                <div className="border-t border-[#263445] my-1" />
                <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-[#55677d]">
                  Set Status
                </div>
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#66c0f4]" />
                  <span>Online</span>
                </button>
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#a4d007]" />
                  <span>In-Game</span>
                </button>
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Away</span>
                </button>
              </div>
            )}
          </div>

          {/* Games Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("games")}
              className={`px-2.5 py-0.5 text-xs font-medium rounded hover:bg-[#212b38] hover:text-white transition-colors cursor-pointer ${
                openDropdown === "games" ? "bg-[#212b38] text-white" : ""
              }`}
            >
              Games
            </button>
            {openDropdown === "games" && (
              <div className="absolute left-0 top-7 w-60 bg-[#1a232f] border border-[#2b3a4c] rounded shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onOpenRedeemKey();
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-[#a4d007]" />
                  <span>Activate a Product on Kiraeve...</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("library");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Manage Games Library</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("help")}
              className={`px-2.5 py-0.5 text-xs font-medium rounded hover:bg-[#212b38] hover:text-white transition-colors cursor-pointer ${
                openDropdown === "help" ? "bg-[#212b38] text-white" : ""
              }`}
            >
              Help
            </button>
            {openDropdown === "help" && (
              <div className="absolute left-0 top-7 w-56 bg-[#1a232f] border border-[#2b3a4c] rounded shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setActiveTab("help");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#66c0f4]" />
                  <span>Kiraeve Support</span>
                </button>
                {onOpenUpdateModal && (
                  <button
                    onClick={() => {
                      onOpenUpdateModal();
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#1a9fff]" />
                    <span>Check for Updates...</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    alert("Kiraeve Game Launcher\nTauri 2.0 Native Shell + Supabase PostgreSQL Backend.");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#a4d007]" />
                  <span>About Kiraeve Launcher</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Windows Caption Controls - Flush to top-right */}
        <div className="flex items-center h-full -mr-2">
          <button
            onClick={handleMinimize}
            className="h-full w-11 inline-flex items-center justify-center hover:bg-[#293649] text-[#8f98a0] hover:text-white transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full w-11 inline-flex items-center justify-center hover:bg-[#293649] text-[#8f98a0] hover:text-white transition-colors cursor-pointer"
            title="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="h-full w-11 inline-flex items-center justify-center hover:bg-[#e81123] text-[#8f98a0] hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Steam Main Navigation Bar */}
      <div className="h-12 w-full flex items-center justify-between px-4 pb-1">
        {/* Left: Main Tabs */}
        <div className="flex items-center gap-5">
          {/* Steam Signature Big Tabs */}
          <nav className="flex items-center gap-6 font-display font-bold text-[13px] tracking-widest uppercase">
            <button
              onClick={() => setActiveTab("store")}
              className={`py-1 transition-all cursor-pointer ${
                activeTab === "store"
                  ? "text-[#1a9fff] border-b-2 border-[#1a9fff] font-black"
                  : "text-[#c7d5e0] hover:text-white hover:scale-105"
              }`}
            >
              STORE
            </button>

            <button
              onClick={() => setActiveTab("library")}
              className={`py-1 transition-all cursor-pointer ${
                activeTab === "library"
                  ? "text-[#1a9fff] border-b-2 border-[#1a9fff] font-black"
                  : "text-[#c7d5e0] hover:text-white hover:scale-105"
              }`}
            >
              LIBRARY
            </button>

            <button
              onClick={() => setActiveTab("community")}
              className={`py-1 transition-all cursor-pointer ${
                activeTab === "community"
                  ? "text-[#1a9fff] border-b-2 border-[#1a9fff] font-black"
                  : "text-[#c7d5e0] hover:text-white hover:scale-105"
              }`}
            >
              COMMUNITY
            </button>

            {/* Click username tab in main nav -> switches directly to Profile */}
            {user && (
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-1 transition-all cursor-pointer ${
                  activeTab === "profile"
                    ? "text-[#1a9fff] border-b-2 border-[#1a9fff] font-black"
                    : "text-[#c7d5e0] hover:text-white hover:scale-105"
                }`}
              >
                {user.username}
              </button>
            )}

            <button
              onClick={() => setActiveTab("help")}
              className={`py-1 transition-all cursor-pointer text-xs ${
                activeTab === "help"
                  ? "text-[#1a9fff] border-b-2 border-[#1a9fff] font-black"
                  : "text-[#8f98a0] hover:text-white hover:scale-105"
              }`}
            >
              SUPPORT
            </button>
          </nav>
        </div>

        {/* Right Section: Authentic Steam User Profile Widget */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 relative">
              {/* Quick Redeem Key Button */}
              <button
                onClick={onOpenRedeemKey}
                className="px-2.5 h-8 rounded bg-[#1e2632] hover:bg-[#2a3647] border border-[#2b3a4c]/60 text-[#ffd700] hover:text-white flex items-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer"
                title="Activate a Product Key"
              >
                <Key className="w-3.5 h-3.5 text-[#ffd700]" />
                <span className="hidden md:inline">Activate Key</span>
              </button>

              {/* Friends List Button */}
              <button
                onClick={onOpenFriends}
                className="w-8 h-8 rounded bg-[#1e2632] hover:bg-[#2a3647] text-[#8f98a0] hover:text-white flex items-center justify-center transition-colors cursor-pointer relative"
                title="Friends List"
              >
                <Users className="w-4 h-4 text-[#66c0f4]" />
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className="w-8 h-8 rounded bg-[#1e2632] hover:bg-[#2a3647] text-[#8f98a0] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>

              {/* Steam Profile Button */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("userAccount")}
                  className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded bg-[#1c2430] hover:bg-[#253243] border border-[#2b3a4c] transition-all cursor-pointer group shadow-sm hover:border-[#66c0f4]/50"
                >
                  {/* Avatar with Steam status frame */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.avatar_url || generateDefaultAvatar(user.username)}
                      alt={user.username}
                      className="w-7 h-7 rounded-sm object-cover"
                    />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#171d25] ${
                        user.status === "in-game"
                          ? "bg-[#a4d007]"
                          : user.status === "online"
                          ? "bg-[#66c0f4]"
                          : "bg-gray-500"
                      }`}
                    />
                  </div>

                  {/* Name and Status / Wallet */}
                  <div className="text-left leading-tight">
                    <span className="text-xs font-bold text-[#e1e6eb] group-hover:text-white block truncate max-w-[110px]">
                      {user.username}
                    </span>
                    <span className="text-[10px] text-[#66c0f4] font-mono block">
                      {user.uid}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-[#8f98a0] group-hover:text-white transition-transform ml-0.5" />
                </button>

                {/* Steam User Dropdown Menu */}
                {openDropdown === "userAccount" && (
                  <div className="absolute right-0 top-11 w-64 bg-[#1a232f] border border-[#2b3a4c] rounded shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    {/* User Summary Header */}
                    <div className="px-4 py-2 border-b border-[#263445] flex items-center gap-3">
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-10 h-10 rounded-sm object-cover border border-[#66c0f4]/40"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white block truncate">
                          {user.username}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#66c0f4]">
                          <span>UID: {user.uid}</span>
                          <button
                            onClick={copyUid}
                            className="p-0.5 hover:text-white cursor-pointer"
                            title="Copy UID"
                          >
                            {copiedUid ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveTab("profile");
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <User className="w-4 h-4 text-[#66c0f4]" />
                        <span>View my profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#2b3a4c] text-[#c7d5e0] hover:text-white flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <SettingsIcon className="w-4 h-4 text-[#8f98a0]" />
                        <span>Account details & Settings</span>
                      </button>
                    </div>

                    <div className="border-t border-[#263445] my-1" />

                    <div className="py-1">
                      <button
                        onClick={() => {
                          onLogout();
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#e81123]/20 text-red-300 hover:text-red-200 flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span>Sign out of {user.username}...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-4 py-1.5 rounded bg-gradient-to-r from-[#47bfff] to-[#1a9fff] hover:from-[#5bc5ff] hover:to-[#2ea5ff] text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
