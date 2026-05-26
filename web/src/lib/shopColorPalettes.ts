export const SHOP_COLOR_PALETTES = ['INDIGO', 'TEAL', 'ROSE', 'AMBER'] as const;
export type ShopColorPalette = (typeof SHOP_COLOR_PALETTES)[number];

export type ShopPaletteTokens = {
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primarySoftText: string;
  shadowPrimary: string;
};

export const SHOP_PALETTE_TOKENS: Record<ShopColorPalette, ShopPaletteTokens> = {
  INDIGO: {
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primarySoft: '#eef2ff',
    primarySoftText: '#4338ca',
    shadowPrimary: '0 4px 14px rgb(79 70 229 / 0.25)',
  },
  TEAL: {
    primary: '#0d9488',
    primaryHover: '#0f766e',
    primarySoft: '#f0fdfa',
    primarySoftText: '#115e59',
    shadowPrimary: '0 4px 14px rgb(13 148 136 / 0.25)',
  },
  ROSE: {
    primary: '#e11d48',
    primaryHover: '#be123c',
    primarySoft: '#fff1f2',
    primarySoftText: '#9f1239',
    shadowPrimary: '0 4px 14px rgb(225 29 72 / 0.25)',
  },
  AMBER: {
    primary: '#d97706',
    primaryHover: '#b45309',
    primarySoft: '#fffbeb',
    primarySoftText: '#92400e',
    shadowPrimary: '0 4px 14px rgb(217 119 6 / 0.25)',
  },
};

export function shopPaletteStyle(
  palette: ShopColorPalette | string | undefined
): Record<string, string> {
  const key = (SHOP_COLOR_PALETTES.includes(palette as ShopColorPalette)
    ? palette
    : 'INDIGO') as ShopColorPalette;
  const t = SHOP_PALETTE_TOKENS[key];
  return {
    ['--color-primary' as string]: t.primary,
    ['--color-primary-hover' as string]: t.primaryHover,
    ['--color-primary-soft' as string]: t.primarySoft,
    ['--color-primary-soft-text' as string]: t.primarySoftText,
    ['--color-accent' as string]: t.primary,
    ['--color-accent-hover' as string]: t.primaryHover,
    ['--color-accent-soft' as string]: t.primarySoft,
    ['--color-accent-soft-text' as string]: t.primarySoftText,
    ['--color-platform' as string]: t.primary,
    ['--color-platform-hover' as string]: t.primaryHover,
    ['--color-platform-soft' as string]: t.primarySoft,
    ['--color-platform-soft-text' as string]: t.primarySoftText,
    ['--shadow-primary' as string]: t.shadowPrimary,
  };
}
