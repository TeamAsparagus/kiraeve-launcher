export interface Game {
  id: string;
  title: string;
  description: string;
  banner_url: string;
  screenshots?: string[];
  github_repo: string;
  exe_target: string;
  is_active: boolean;
  version?: string;
  is_installed?: boolean;
  is_unlocked?: boolean;
  last_played?: string;
  playtime_hours?: number;
  category?: string;
  price?: string;
  discount?: string;
  release_date?: string;
  tags?: string[];
  patch_notes?: { version: string; date: string; changes: string[] }[];
  system_requirements?: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
}

export interface UserProfile {
  id: string;
  uid: string; // e.g. KE-8F3A2B
  username: string;
  avatar_url?: string;
  email?: string;
  bio?: string;
  level?: number;
  status?: "online" | "in-game" | "offline" | "away";
  custom_status?: string;
  background_url?: string;
}

export interface Friend {
  uid: string;
  username: string;
  avatar_url: string;
  status: "online" | "in-game" | "offline" | "away";
  game_playing?: string;
}

export interface LauncherSettings {
  installPath: string;
  autoUpdate: boolean;
  enableDiscordRPC: boolean;
  githubToken?: string;
}
