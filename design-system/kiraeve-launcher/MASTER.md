# Design System: Kiraeve Launcher

> Generated via UI/UX Pro Max
> Theme: Gaming Dark Minimalist / High-Contrast Esports

## Color Tokens

```css
:root {
  --color-primary: #7C3AED;           /* Neon Violet */
  --color-on-primary: #FFFFFF;
  --color-secondary: #A78BFA;         /* Soft Lavender */
  --color-on-secondary: #0F172A;
  --color-accent: #F43F5E;            /* Rose Red / Glowing Play CTA */
  --color-on-accent: #000000;
  --color-background: #0F0F23;        /* Deep Gaming Obsidian */
  --color-foreground: #E2E8F0;        /* Slate Light */
  --color-card: #1E1C35;              /* Panel Dark Violet */
  --color-card-foreground: #E2E8F0;
  --color-muted: #27273B;             /* Subdued Surface */
  --color-muted-foreground: #94A3B8;   /* Muted Slate */
  --color-border: #4C1D95;            /* Dark Purple Accent Border */
  --color-destructive: #EF4444;
  --color-on-destructive: #FFFFFF;
  --color-ring: #7C3AED;
}
```

## Typography

- **Display / Headers**: `Russo One` or `Chakra Petch` (700/600)
- **Body / Subtext**: `Chakra Petch` (400/500) or `Inter` (14px/16px, line-height 1.5)
- **CSS Import**:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Russo+One&display=swap');
  ```

## UI Hierarchy & Layout (Desktop Launcher)

1. **Window Frame**: Custom draggable titlebar with minimize, maximize, close buttons (Tauri native decoration disabled or frameless).
2. **Sidebar Nav**:
   - Creator/Studio Brand Header.
   - Navigation: Library, Store/Catalog, Downloads, Settings.
   - User Profile Footer: Avatar, Username, Permanent UID chip (`KE-xxxxx`), Logout.
3. **Main Content Area**:
   - **Game Grid View**: Card grid displaying game banner, title, version, status (Installed / Update Available / Locked).
   - **Game Detail View**: Hero banner, play/download button (Accent `#F43F5E`), download progress bar, release notes.

## Strict UI Rules
- No emojis anywhere in the interface. Use clean SVG icons (Lucide Icons).
- All interactive elements must have `cursor-pointer` and 150-200ms smooth transition states.
- High contrast: Text meets WCAG AA 4.5:1 on `#0F0F23` and `#1E1C35`.
