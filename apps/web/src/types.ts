import type { TemplateConfig } from "@/lib/compositor";
import type { FilterDef } from "@/lib/filters";
import type { Session, Booth, Package } from "@/api/client";

export type AppScreen =
  | "landing"
  | "template_select"
  | "studio"
  | "preview"
  | "admin_login"
  | "admin_dashboard";

export interface CapturedPhoto {
  slotIndex: number;
  originalCanvas: HTMLCanvasElement;
  processedCanvas: HTMLCanvasElement;
  dataUrl: string;
  filterName: string;
  capturedAt: Date;
}

export interface PhotoboothTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  themeColor: string;
  accentColor: string;
  badge: string;
  config: TemplateConfig;
}

export interface BoothState {
  currentScreen: AppScreen;
  selectedTemplate: PhotoboothTemplate | null;
  selectedFilter: FilterDef;
  captures: (CapturedPhoto | null)[];
  currentSlotIndex: number;
  totalSlots: number;
  sessionTimeRemaining: number; // in seconds (240 for 4 mins)
  isTimerRunning: boolean;
  retakesCount: number;
  maxRetakes: number;
  isCountingDown: boolean;
  countdownValue: number;
  isFlashing: boolean;
  finalStripUrl: string | null;
  isPrinting: boolean;
  printProgress: number;
  isPrintComplete: boolean;
  activeBackendSession: Session | null;
  selectedBooth: Booth | null;
  selectedPackage: Package | null;
  adminToken: string | null;
  deviceToken: string | null;
}
