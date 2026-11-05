import React, { useState } from "react";
import {
  ShoppingBag,
  Check,
  MessageSquare,
  ExternalLink,
  Key,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Game } from "../types";

interface StorePageProps {
  games: Game[];
  onUnlockGame: (gameId: string) => void;
  onGoToGame: (gameId: string) => void;
  onOpenRedeemKey?: () => void;
}

export const StorePage: React.FC<StorePageProps> = ({
  games,
  onGoToGame,
  onOpenRedeemKey,
}) => {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);

  const featuredGame = games[featuredIndex] || games[0];

  const screenshots = featuredGame?.screenshots && featuredGame.screenshots.length > 0
    ? featuredGame.screenshots
    : [
        featuredGame?.banner_url,
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      ];

  const currentPreviewImage = screenshots[selectedScreenshotIndex] || featuredGame?.banner_url;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1b2838] select-none text-[#c7d5e0] animate-page-enter">
      <div className="max-w-6xl mx-auto p-8 space-y-10">
        {/* Steam Store Header Banner */}
        <div className="flex items-center justify-between border-b border-[#2a475e]/40 pb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-[#1a9fff]" />
            <div>
              <h1 className="font-display text-2xl font-black text-white uppercase tracking-wider">
                Featured & Recommended
              </h1>
              <p className="text-xs text-[#8f98a0]">
                Official creator games catalog. Purchases are handled directly in Discord.
              </p>
            </div>
          </div>
          <a
            href="https://discord.gg/Hh47ZMQsfF"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] border border-[#5865F2]/40 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Order on Discord</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Big Steam Featured Spotlight Hero with Screenshot Carousel */}
        {featuredGame && (
          <div className="bg-[#0b1016] border border-[#2a475e]/60 rounded-xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-3 transition-all duration-300">
            {/* Main Visual & Screenshot Gallery */}
            <div className="lg:col-span-2 flex flex-col bg-black">
              {/* Main Active Image Preview */}
              <div className="relative aspect-[16/9] w-full overflow-hidden group">
                <img
                  src={currentPreviewImage}
                  alt={featuredGame.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                {/* Screenshot navigation arrows */}
                <button
                  onClick={() =>
                    setSelectedScreenshotIndex((prev) =>
                      prev === 0 ? screenshots.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-[#66c0f4] focus-visible:outline-none cursor-pointer"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setSelectedScreenshotIndex((prev) =>
                      prev === screenshots.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-[#66c0f4] focus-visible:outline-none cursor-pointer"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Thumbnails Strip */}
              <div className="p-3 bg-[#11161f] border-t border-[#2a475e]/40 flex items-center gap-2 overflow-x-auto">
                {screenshots.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedScreenshotIndex(idx)}
                    className={`relative w-20 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#66c0f4] focus-visible:outline-none ${
                      selectedScreenshotIndex === idx
                        ? "border-[#1a9fff] scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar info */}
            <div className="p-6 flex flex-col justify-between space-y-4 bg-[#121922]">
              <div className="space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-[#66c0f4] uppercase font-bold px-2 py-0.5 rounded bg-[#2a475e]/40 inline-block">
                  Spotlight Feature
                </span>
                <h2 className="text-2xl font-black text-white leading-tight">
                  {featuredGame.title}
                </h2>
                <p className="text-xs text-[#8f98a0] leading-relaxed line-clamp-3">
                  {featuredGame.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#2a475e]/40 text-[#c7d5e0]">
                    {featuredGame.category || "Action"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#2a475e]/40 text-[#c7d5e0]">
                    Singleplayer
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#2a475e]/40 text-[#c7d5e0]">
                    Windows 64-bit
                  </span>
                </div>
              </div>

              {/* Price & Actions (DISCORD BUYING INTEGRATION) */}
              <div className="pt-4 border-t border-[#2a475e]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {featuredGame.discount ? (
                      <span className="px-1.5 py-0.5 bg-[#4c6b22] text-[#a4d007] text-xs font-bold rounded">
                        {featuredGame.discount}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-[#2a475e]/60 text-[#66c0f4] text-xs font-bold rounded">
                        DISCORD EXCLUSIVE
                      </span>
                    )}
                    <span className="text-sm font-bold text-white">Buy via Discord</span>
                  </div>
                  <span className="text-xs text-[#8f98a0] font-mono">UID Entitlement</span>
                </div>

                {featuredGame.is_unlocked ? (
                  <button
                    onClick={() => onGoToGame(featuredGame.id)}
                    className="w-full py-2.5 px-4 rounded bg-[#2a475e] hover:bg-[#385c79] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4 text-[#a4d007]" />
                    <span>In Library - Play Now</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* Primary Discord Buy Button */}
                    <a
                      href="https://discord.gg/Hh47ZMQsfF"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-[#5865F2]/25 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>สั่งซื้อใน Discord (discord.gg)</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>

                    {/* Secondary Product Key Option */}
                    {onOpenRedeemKey && (
                      <button
                        onClick={onOpenRedeemKey}
                        className="w-full py-2 px-3 rounded bg-[#1c2430] hover:bg-[#253243] text-[#c7d5e0] text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-[#2a475e]/50 transition-colors cursor-pointer"
                      >
                        <Key className="w-3 h-3 text-[#ffd700]" />
                        <span>มีรหัสผลิตภัณฑ์แล้ว? ใส่รหัส (Product Key)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Thumbnail Selector Strip for Featured Games */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {games.map((g, idx) => {
            const isSelected = idx === featuredIndex;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setFeaturedIndex(idx);
                  setSelectedScreenshotIndex(0);
                }}
                className={`flex-shrink-0 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#21374a] border-[#1a9fff] shadow-lg"
                    : "bg-[#171a21] border-[#2a475e]/30 hover:border-[#2a475e] opacity-75 hover:opacity-100"
                }`}
              >
                <img
                  src={g.banner_url}
                  alt={g.title}
                  className="w-16 h-10 object-cover rounded"
                />
                <div className="pr-2">
                  <div className="text-xs font-bold text-white truncate max-w-[140px]">
                    {g.title}
                  </div>
                  <div className="text-[10px] text-[#8f98a0]">
                    {g.is_unlocked ? "Owned" : "Buy in Discord"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* System Requirements Section */}
        {featuredGame && (
          <div className="bg-[#121922] border border-[#2a475e]/50 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#2a475e]/30 pb-3">
              <Monitor className="w-5 h-5 text-[#66c0f4]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                System Requirements for {featuredGame.title}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#8f98a0]">
              {/* Minimum Specs */}
              <div className="space-y-2.5 bg-[#0e131a] p-4 rounded-lg border border-[#2a475e]/30">
                <span className="font-bold text-white uppercase text-[11px] tracking-wider block">
                  Minimum Requirements
                </span>
                <ul className="space-y-1.5 leading-relaxed text-[11px]">
                  <li><strong className="text-[#c7d5e0]">OS:</strong> Windows 10 (64-bit)</li>
                  <li><strong className="text-[#c7d5e0]">Processor:</strong> Intel Core i3-6100 / AMD Ryzen 3 1200</li>
                  <li><strong className="text-[#c7d5e0]">Memory:</strong> 8 GB RAM</li>
                  <li><strong className="text-[#c7d5e0]">Graphics:</strong> NVIDIA GeForce GTX 960 / AMD Radeon R9 280</li>
                  <li><strong className="text-[#c7d5e0]">DirectX:</strong> Version 11</li>
                  <li><strong className="text-[#c7d5e0]">Storage:</strong> 15 GB available space</li>
                </ul>
              </div>

              {/* Recommended Specs */}
              <div className="space-y-2.5 bg-[#0e131a] p-4 rounded-lg border border-[#2a475e]/30">
                <span className="font-bold text-emerald-400 uppercase text-[11px] tracking-wider block">
                  Recommended Specifications
                </span>
                <ul className="space-y-1.5 leading-relaxed text-[11px]">
                  <li><strong className="text-[#c7d5e0]">OS:</strong> Windows 11 (64-bit)</li>
                  <li><strong className="text-[#c7d5e0]">Processor:</strong> Intel Core i5-10400 / AMD Ryzen 5 3600</li>
                  <li><strong className="text-[#c7d5e0]">Memory:</strong> 16 GB RAM</li>
                  <li><strong className="text-[#c7d5e0]">Graphics:</strong> NVIDIA GeForce RTX 3060 / AMD Radeon RX 6600</li>
                  <li><strong className="text-[#c7d5e0]">DirectX:</strong> Version 12</li>
                  <li><strong className="text-[#c7d5e0]">Storage:</strong> 25 GB SSD space</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
