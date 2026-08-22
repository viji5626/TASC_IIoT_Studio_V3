/**
 * TASC IIoT Studio — Scalable Industrial Graphics Symbol Schema & Metadata Types
 * Supports up to 3500+ symbols across 31 industrial sectors with 2D & 3D variants.
 */

export type SymbolStyleVariant = 'flat2d' | '3d' | 'isometric';

export type AnchorConnectionType = 
  | 'inlet' 
  | 'outlet' 
  | 'pipe' 
  | 'duct' 
  | 'electrical' 
  | 'mechanical' 
  | 'bidirectional' 
  | 'signal' 
  | 'drain';

export type AnchorDirection = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back' | 'omni';

export interface SymbolAnchorPoint {
  id: string;
  name?: string;
  x: number; // Relative coordinate inside SVG viewBox (0..viewBoxWidth)
  y: number; // Relative coordinate inside SVG viewBox (0..viewBoxHeight)
  type: AnchorConnectionType;
  direction?: AnchorDirection;
  diameter?: number;
  flanged?: boolean;
  pressureRating?: string;
}

export interface SymbolMetadata {
  id: string;                                   // Deterministic ID: sector.category.item.variant (or legacy ID)
  name: string;                                 // Human-readable title
  sector: string;                               // Sector: HVAC, Mining, Material Handling, Pumps, Valves, etc.
  category: string;                             // Category: Ducts, Crushers, Conveyors, etc.
  subcategory?: string;                         // Subcategory: Elbows, Axial Fans, Wafer Valves, etc.
  tags: string[];                               // Search tags & keywords
  styleVariant: SymbolStyleVariant;             // 'flat2d' | '3d' | 'isometric'
  defaultW: number;                             // Recommended default canvas width
  defaultH: number;                             // Recommended default canvas height
  viewBox?: string;                             // SVG viewBox e.g. "0 0 100 100"
  anchorPoints?: SymbolAnchorPoint[];           // Snapping & connecting points for pipes/ducts/wires
  connectionPoints?: SymbolAnchorPoint[];       // Legacy alias for anchorPoints
  orientationVariants?: ('0' | '90' | '180' | '270' | 'flip_h' | 'flip_v')[];
  themeCompatibility?: ('dark' | 'light' | 'all')[];
  animationReady?: boolean;                     // Flag indicating dynamic SCADA animation support
  animatableParts?: string[];                   // Specific sub-part IDs that can spin, pulse, or fill
  description?: string;                         // Technical summary / industrial standard
  svgContent?: string;                          // Master SVG markup (source of truth)
  assetPath?: string;                           // Remote or static relative asset path
  previewPath?: string;                         // Optional pre-rendered PNG thumbnail path
  legacyId?: string;                            // Backward compatibility identifier mapping
}

export interface SymbolSubCategoryNode {
  id: string;
  name: string;
  count: number;
}

export interface SymbolCategoryNode {
  id: string;
  name: string;
  icon: string;
  sector: string;
  count: number;
  subcategories?: SymbolSubCategoryNode[];
}

export interface SymbolSectorNode {
  id: string;
  name: string;
  icon: string;
  count: number;
  categories: SymbolCategoryNode[];
}

export interface SymbolManifest {
  version: string;
  schemaVersion: string;
  generatedAt: string;
  totalSymbols: number;
  sectors: SymbolSectorNode[];
  categories: SymbolCategoryNode[];
  variants: {
    flat2d: number;
    '3d': number;
    isometric?: number;
  };
  symbols: SymbolMetadata[];
}

export interface SymbolSearchIndexEntry {
  id: string;
  name: string;
  tokens: string[];                             // Lowercase search tokens
  sector: string;
  category: string;
  subcategory?: string;
  styleVariant: SymbolStyleVariant;
  tags: string[];
}

export interface SymbolTagIndex {
  [tag: string]: string[];                      // Tag -> Array of Symbol IDs
}

export interface SymbolFilterOptions {
  query?: string;
  sector?: string;
  category?: string;
  subcategory?: string;
  styleVariant?: 'all' | 'flat2d' | '3d';
  tags?: string[];
  favoritesOnly?: boolean;
  recentOnly?: boolean;
}

export interface SymbolInsertionOptions {
  format: 'svg' | 'png';
  targetBinding?: {
    dataSourceMode: 'mqtt' | 'driver';
    driverTagId?: string;
    topic?: string;
  };
  dropX?: number;
  dropY?: number;
}
