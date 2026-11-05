import React, { useState } from "react";
import { Search, Lock, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Game } from "../types";

interface SteamSidebarProps {
  games: Game[];
  selectedGameId: string;
  onSelectGame: (id: string) => void;
}

export const SteamSidebar: React.FC<SteamSidebarProps> = ({
  games,
  selectedGameId,
  onSelectGame,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInstalled, setFilterInstalled] = useState(false);

  const filteredGames = games.filter((g) => {
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
            placeholder="Search by name"
            className="w-full bg-[#101216] border border-[#2a475e]/40 rounded px-2.5 py-1.5 pl-7 text-xs text-[#c7d5e0] placeholder-[#4e5963] focus:outline-none focus:border-[#66c0f4] transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[#4e5963] absolute left-2 top-2" />
        </div>

        {/* Filter toggles */}
        <div className="flex items-center justify-between text-[11px] text-[#8f98a0] px-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Games ({filteredGames.length})
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
        {filteredGames.length === 0 ? (
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
                  {!game.is_unlocked ? (
                    <span title="Locked">
                      <Lock className="w-3 h-3 text-[#f43f5e]" />
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
