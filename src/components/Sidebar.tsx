import React, { useState } from "react";
import { Search, CheckCircle2, SlidersHorizontal, ArrowUpCircle, ShoppingBag } from "lucide-react";
import { Game } from "../types";

interface SteamSidebarProps {
  games: Game[];
  selectedGameId: string;
  onSelectGame: (id: string) => void;
  onOpenStore?: () => void;
  runningGameIds?: string[];
}

export const SteamSidebar: React.FC<SteamSidebarProps> = ({
  games,
  selectedGameId,
  onSelectGame,
  onOpenStore,
  runningGameIds = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInstalled, setFilterInstalled] = useState(false);

  // Library should strictly display owned/unlocked games
  const ownedGames = games.filter((g) => g.is_unlocked);

  const filteredGames = ownedGames.filter((g) => {
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterInstalled ? g.is_installed : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <aside className="w-64 bg-[#1b2838] border-r border-[#2a475e]/30 flex flex-col flex-shrink-0 select-none overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-3 bg-[#171a21]/80 border-b border-[#2a475e]/30 space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library..."
            aria-label="Search games library"
            className="w-full bg-[#101216] border border-[#2a475e]/40 rounded px-2.5 py-1.5 pl-7 text-xs text-[#c7d5e0] placeholder-[#768696] focus:outline-none focus:border-[#66c0f4] focus-visible:ring-1 focus-visible:ring-[#66c0f4] transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[#768696] absolute left-2 top-2" />
        </div>

        {/* Filter toggles */}
        <div className="flex items-center justify-between text-[11px] text-[#8f98a0] px-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            My Games ({ownedGames.length})
          </span>
          <button
            onClick={() => setFilterInstalled(!filterInstalled)}
            className={`flex items-center gap-1 hover:text-white transition-colors cursor-pointer ${
              filterInstalled ? "text-[#66c0f4] font-semibold" : ""
            }`}
            title="Filter installed only"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Ready to Play</span>
          </button>
        </div>
      </div>

      {/* Game List Items */}
      <div className="flex-1 overflow-y-auto py-1 divide-y divide-[#2a475e]/10">
        {ownedGames.length === 0 ? (
          <div className="p-5 text-center space-y-3">
            <div className="w-9 h-9 rounded-full bg-[#203144] flex items-center justify-center mx-auto text-[#66c0f4]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">คลังเกมว่างเปล่า</p>
              <p className="text-[11px] text-[#8f98a0] leading-relaxed">
                คุณยังไม่มีเกมในคลัง ไปที่ร้านค้าเพื่อเลือกรับหรือเปิดใช้งานเกม
              </p>
            </div>
            {onOpenStore && (
              <button
                onClick={onOpenStore}
                className="w-full py-2 px-3 rounded bg-gradient-to-r from-[#1a9fff] to-[#0078d4] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                ไปที่หน้าร้านค้า (Store)
              </button>
            )}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8f98a0]">
            No games match your search.
          </div>
        ) : (
          filteredGames.map((game) => {
            const isSelected = game.id === selectedGameId;
            return (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer group ${
                  isSelected
                    ? "bg-gradient-to-r from-[#21374a] to-[#1c2c3c] text-white border-l-2 border-[#1a9fff]"
                    : "hover:bg-[#203144]/60 text-[#c7d5e0] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded overflow-hidden bg-[#101216] flex-shrink-0 border border-[#2a475e]/30">
                    <img
                      src={game.banner_url}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    className={`text-xs truncate ${
                      isSelected ? "font-bold text-white" : "font-normal text-[#c7d5e0]"
                    }`}
                  >
                    {game.title}
                  </span>
                </div>

                {/* Status Badges */}
                <div className="flex-shrink-0 ml-2">
                  {runningGameIds.includes(game.id) ? (
                    <span
                      title="Now Playing"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-[#a4d007]/20 text-[#a4d007] border border-[#a4d007]/40 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a4d007] animate-ping" />
                      <span>RUNNING</span>
                    </span>
                  ) : game.needs_update ? (
                    <span
                      title="Update Available"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1a9fff]/20 text-[#66c0f4] border border-[#1a9fff]/40"
                    >
                      <ArrowUpCircle className="w-2.5 h-2.5 text-[#1a9fff] animate-pulse" />
                      <span>UPDATE</span>
                    </span>
                  ) : game.is_installed ? (
                    <span title="Installed">
                      <CheckCircle2 className="w-3 h-3 text-[#a4d007]" />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
