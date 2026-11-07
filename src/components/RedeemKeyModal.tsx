import React, { useState } from "react";
import { X, Key, Check, AlertCircle, MessageSquare, ExternalLink } from "lucide-react";

interface RedeemKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedeem: (productKey: string) => Promise<{ ok: boolean; message: string }> | { ok: boolean; message: string };
}

export const RedeemKeyModal: React.FC<RedeemKeyModalProps> = ({
  isOpen,
  onClose,
  onRedeem,
}) => {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  if (!isOpen) return null;

  const handleActivate = async () => {
    if (!key.trim()) return;
    const res = await onRedeem(key.trim());
    if (res.ok) {
      setStatus("success");
      setMsg(res.message);
      setTimeout(() => {
        onClose();
        setStatus("idle");
        setKey("");
      }, 1500);
    } else {
      setStatus("error");
      setMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#181a21] border border-[#2a475e]/80 rounded shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Steam-style Titlebar */}
        <div className="bg-[#171a21] px-5 py-3 border-b border-[#2a475e]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#a4d007]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#c7d5e0]">
              Product Activation
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8f98a0] hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#c7d5e0] leading-relaxed">
            กรอกรหัสผลิตภัณฑ์ (Product Activation Key) เพื่อปลดล็อกสิทธิ์เกมผูกเข้ากับรหัส UID ของคุณถาวร
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8f98a0] block">
              Product Code
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleActivate();
              }}
              placeholder="กรอกรหัสคีย์ที่ได้รับจากแอดมิน"
              className="w-full bg-[#12141a] border border-[#2a475e]/60 rounded px-3 py-2 text-xs font-mono text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] uppercase"
            />
          </div>

          <div className="p-3 rounded bg-[#141d27] border border-[#5865F2]/30 flex items-center justify-between text-xs">
            <span className="text-[#b8b6b4] text-[11px]">ยังไม่มีรหัสคีย์เกม?</span>
            <a
              href="https://discord.gg/Hh47ZMQsfF"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5865F2] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>สั่งซื้อคีย์ใน Discord</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {status === "success" && (
            <div className="p-3 bg-green-950/40 border border-green-500/30 rounded flex items-center gap-2 text-xs text-green-300">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {status === "error" && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#171a21] px-6 py-3 border-t border-[#2a475e]/40 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-[#c7d5e0] hover:text-white hover:bg-[#2a475e]/30 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleActivate}
            className="px-5 py-2 rounded bg-gradient-to-r from-[#799905] to-[#a4d007] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            Activate Key
          </button>
        </div>
      </div>
    </div>
  );
};
