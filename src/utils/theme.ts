export interface AppThemePreset {
  id: string;
  name: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  bgCanvas: string;
  bgHeader: string;
  bgSidebar: string;
  bgCard: string;
  cardBorder: string;
  accentGlow: string;
  accentSoft: string;
  badgeBg: string;
  ringColor: string;
}

export const APP_THEMES: AppThemePreset[] = [
  {
    id: 'sky',
    name: 'Sky Blue',
    primary: '#0ea5e9',
    primaryHover: '#38bdf8',
    primaryText: '#38bdf8',
    bgCanvas: '#020617',
    bgHeader: '#0b1329',
    bgSidebar: '#0b1329',
    bgCard: 'rgba(15, 23, 42, 0.85)',
    cardBorder: '#1e293b',
    accentGlow: 'rgba(14, 165, 233, 0.3)',
    accentSoft: 'rgba(14, 165, 233, 0.15)',
    badgeBg: 'rgba(14, 165, 233, 0.2)',
    ringColor: '#38bdf8'
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    primary: '#f59e0b',
    primaryHover: '#fbbf24',
    primaryText: '#fbbf24',
    bgCanvas: '#0f0a02',
    bgHeader: '#1a1205',
    bgSidebar: '#1a1205',
    bgCard: 'rgba(28, 20, 8, 0.85)',
    cardBorder: '#3a270b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    accentSoft: 'rgba(245, 158, 11, 0.15)',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    ringColor: '#fbbf24'
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    primary: '#10b981',
    primaryHover: '#34d399',
    primaryText: '#34d399',
    bgCanvas: '#020f0a',
    bgHeader: '#061c14',
    bgSidebar: '#061c14',
    bgCard: 'rgba(8, 30, 22, 0.85)',
    cardBorder: '#103f2d',
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    accentSoft: 'rgba(16, 185, 129, 0.15)',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    ringColor: '#34d399'
  },
  {
    id: 'indigo',
    name: 'Indigo Violet',
    primary: '#6366f1',
    primaryHover: '#818cf8',
    primaryText: '#818cf8',
    bgCanvas: '#070719',
    bgHeader: '#0f102b',
    bgSidebar: '#0f102b',
    bgCard: 'rgba(19, 20, 48, 0.85)',
    cardBorder: '#27295e',
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    accentSoft: 'rgba(99, 102, 241, 0.15)',
    badgeBg: 'rgba(99, 102, 241, 0.2)',
    ringColor: '#818cf8'
  },
  {
    id: 'rose',
    name: 'Rose Red',
    primary: '#f43f5e',
    primaryHover: '#fb7185',
    primaryText: '#fb7185',
    bgCanvas: '#140407',
    bgHeader: '#22080d',
    bgSidebar: '#22080d',
    bgCard: 'rgba(38, 12, 18, 0.85)',
    cardBorder: '#541724',
    accentGlow: 'rgba(244, 63, 94, 0.3)',
    accentSoft: 'rgba(244, 63, 94, 0.15)',
    badgeBg: 'rgba(244, 63, 94, 0.2)',
    ringColor: '#fb7185'
  },
  {
    id: 'purple',
    name: 'Amethyst Purple',
    primary: '#a855f7',
    primaryHover: '#c084fc',
    primaryText: '#c084fc',
    bgCanvas: '#0e0417',
    bgHeader: '#1a0a2a',
    bgSidebar: '#1a0a2a',
    bgCard: 'rgba(28, 12, 44, 0.85)',
    cardBorder: '#431969',
    accentGlow: 'rgba(168, 85, 247, 0.3)',
    accentSoft: 'rgba(168, 85, 247, 0.15)',
    badgeBg: 'rgba(168, 85, 247, 0.2)',
    ringColor: '#c084fc'
  },
  {
    id: 'cyan',
    name: 'Teal Cyan',
    primary: '#06b6d4',
    primaryHover: '#22d3ee',
    primaryText: '#22d3ee',
    bgCanvas: '#020d12',
    bgHeader: '#051b22',
    bgSidebar: '#051b22',
    bgCard: 'rgba(8, 28, 36, 0.85)',
    cardBorder: '#0e3d4f',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    accentSoft: 'rgba(6, 182, 212, 0.15)',
    badgeBg: 'rgba(6, 182, 212, 0.2)',
    ringColor: '#22d3ee'
  },
  {
    id: 'slate',
    name: 'Monochrome Slate',
    primary: '#64748b',
    primaryHover: '#94a3b8',
    primaryText: '#94a3b8',
    bgCanvas: '#0f1217',
    bgHeader: '#181d26',
    bgSidebar: '#181d26',
    bgCard: 'rgba(24, 29, 38, 0.85)',
    cardBorder: '#334155',
    accentGlow: 'rgba(100, 116, 139, 0.3)',
    accentSoft: 'rgba(100, 116, 139, 0.15)',
    badgeBg: 'rgba(100, 116, 139, 0.2)',
    ringColor: '#94a3b8'
  }
];

export function getAppTheme(themeId?: string): AppThemePreset {
  return APP_THEMES.find(t => t.id === themeId) || APP_THEMES[0];
}

export function applyThemeToDocument(themeId?: string) {
  const theme = getAppTheme(themeId);
  const root = document.documentElement;
  
  root.style.setProperty('--bg-color', theme.bgCanvas);
  root.style.setProperty('--bg-header', theme.bgHeader);
  root.style.setProperty('--bg-sidebar', theme.bgSidebar);
  root.style.setProperty('--card-bg', theme.bgCard);
  root.style.setProperty('--border-color', theme.cardBorder);
  root.style.setProperty('--accent', theme.primary);
  root.style.setProperty('--accent-hover', theme.primaryHover);
  root.style.setProperty('--accent-glow', theme.accentGlow);
  root.style.setProperty('--accent-soft', theme.accentSoft);
  root.style.setProperty('--badge-bg', theme.badgeBg);
}
