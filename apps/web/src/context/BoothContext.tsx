import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import type { AppScreen, CapturedPhoto, PhotoboothTemplate } from "@/types";
import { PHOTOBOOTH_TEMPLATES } from "@/lib/templates";
import { FALLBACK_FILTERS, applyFilter, type FilterDef } from "@/lib/filters";
import { composite, type SlotImage } from "@/lib/compositor";
import { playBeep, playShutterSound, playPrintSound } from "@/lib/sound";
import type { Session, Booth, Package } from "@/api/client";
import { loadAuth } from "@/api/session";

// Extended LUT filters for cinema booth
export const BOOTH_LUTS: FilterDef[] = [
  ...FALLBACK_FILTERS,
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "High contrast neon tint",
    css: "contrast(1.25) saturate(1.4) hue-rotate(25deg) brightness(1.05)",
  },
  {
    id: "peach",
    name: "Peach Glow",
    description: "Soft warm pastel skin glow",
    css: "brightness(1.08) contrast(0.95) saturate(1.2) sepia(0.2)",
  },
  {
    id: "moody",
    name: "Moody Film",
    description: "Deep shadows with muted tones",
    css: "contrast(1.3) brightness(0.92) saturate(0.85) sepia(0.1)",
  },
  {
    id: "emerald",
    name: "Emerald Noir",
    description: "Teal & emerald cinematic look",
    css: "hue-rotate(150deg) saturate(0.7) contrast(1.15)",
  },
];

const TOTAL_SLOTS = 3;
const SESSION_DEFAULT_DURATION = 240; // 4 minutes

interface BoothContextType {
  // Navigation
  screen: AppScreen;
  setScreen: (screen: AppScreen) => void;

  // Template & Filters
  selectedTemplate: PhotoboothTemplate;
  setSelectedTemplate: (template: PhotoboothTemplate) => void;
  selectedFilter: FilterDef;
  setSelectedFilter: (filter: FilterDef) => void;

  // Slots & Captures
  captures: (CapturedPhoto | null)[];
  activeSlotIndex: number;
  setActiveSlotIndex: (index: number) => void;
  totalSlots: number;
  isAllSlotsFilled: boolean;
  hasAnyCapture: boolean;

  // Session & Timer (4 minutes)
  timeRemaining: number;
  isTimerActive: boolean;
  retakesCount: number;
  maxRetakes: number;
  startSessionTimer: () => void;
  pauseSessionTimer: () => void;
  resetSessionTimer: () => void;

  // Capture Actions
  isCountingDown: boolean;
  countdownValue: number;
  isFlashing: boolean;
  startCaptureCountdown: (captureCanvasFn: () => HTMLCanvasElement | null) => Promise<void>;
  retakeSlot: (slotIndex?: number) => void;

  // Final Output & Print
  finalStripDataUrl: string | null;
  generateFinalStrip: () => Promise<string>;
  isPrinting: boolean;
  printProgress: number;
  isPrintComplete: boolean;
  triggerPrint: () => Promise<void>;
  resetToStart: () => void;

  // Backend Integration
  backendSession: Session | null;
  activeBooth: Booth | null;
  activePackage: Package | null;
  isBackendConnected: boolean;
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
}

const BoothContext = createContext<BoothContextType | null>(null);

export const BoothProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [selectedTemplate, setSelectedTemplate] = useState<PhotoboothTemplate>(PHOTOBOOTH_TEMPLATES[0]);
  const [selectedFilter, setSelectedFilter] = useState<FilterDef>(BOOTH_LUTS[0]);
  const [captures, setCaptures] = useState<(CapturedPhoto | null)[]>([null, null, null]);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

  // 4-Minute Session Timer
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_DEFAULT_DURATION);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [retakesCount, setRetakesCount] = useState<number>(0);
  const maxRetakes = 5;

  // Countdown & Flash
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [countdownValue, setCountdownValue] = useState<number>(3);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Final Strip & Printing
  const [finalStripDataUrl, setFinalStripDataUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printProgress, setPrintProgress] = useState<number>(0);
  const [isPrintComplete, setIsPrintComplete] = useState<boolean>(false);

  // Backend state
  const [backendSession] = useState<Session | null>(null);
  const [activeBooth] = useState<Booth | null>(null);
  const [activePackage] = useState<Package | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => loadAuth("operator")?.token || null);

  const countdownIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Check backend health on mount
  useEffect(() => {
    fetch("/health")
      .then((res) => {
        if (res.ok) setIsBackendConnected(true);
      })
      .catch(() => setIsBackendConnected(false));
  }, []);

  // Timer Tick effect
  useEffect(() => {
    if (isTimerActive && timeRemaining > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerActive(false);
            // If time expires during studio, transition to preview
            if (screen === "studio") {
              setScreen("preview");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerActive, timeRemaining, screen]);

  const startSessionTimer = useCallback(() => {
    setIsTimerActive(true);
  }, []);

  const pauseSessionTimer = useCallback(() => {
    setIsTimerActive(false);
  }, []);

  const resetSessionTimer = useCallback(() => {
    setTimeRemaining(SESSION_DEFAULT_DURATION);
    setIsTimerActive(false);
  }, []);

  // Check slot completion
  const isAllSlotsFilled = captures.every((c) => c !== null);
  const hasAnyCapture = captures.some((c) => c !== null);

  // Capture countdown and snapshot logic
  const startCaptureCountdown = useCallback(
    async (captureCanvasFn: () => HTMLCanvasElement | null) => {
      if (isCountingDown) return;

      // Determine which slot to capture
      let targetIndex = activeSlotIndex;
      if (captures[targetIndex] !== null) {
        const nextEmpty = captures.findIndex((c) => c === null);
        if (nextEmpty !== -1) {
          targetIndex = nextEmpty;
          setActiveSlotIndex(nextEmpty);
        }
      }

      setIsCountingDown(true);
      setCountdownValue(3);
      playBeep(660, 0.12);

      let count = 3;
      return new Promise<void>((resolve) => {
        countdownIntervalRef.current = window.setInterval(() => {
          count -= 1;
          if (count > 0) {
            setCountdownValue(count);
            playBeep(660, 0.12);
          } else if (count === 0) {
            setCountdownValue(0); // "SMILE!"
            playBeep(980, 0.25);
          } else {
            clearInterval(countdownIntervalRef.current!);
            setIsCountingDown(false);

            // Shutter Flash & Sound
            setIsFlashing(true);
            playShutterSound();
            setTimeout(() => setIsFlashing(false), 500);

            // Grab frame from camera
            try {
              const rawCanvas = captureCanvasFn();
              if (rawCanvas) {
                // Apply selected filter
                const processedCanvas = applyFilter(rawCanvas, selectedFilter);
                const dataUrl = processedCanvas.toDataURL("image/jpeg", 0.92);

                const newPhoto: CapturedPhoto = {
                  slotIndex: targetIndex,
                  originalCanvas: rawCanvas,
                  processedCanvas,
                  dataUrl,
                  filterName: selectedFilter.name,
                  capturedAt: new Date(),
                };

                setCaptures((prev) => {
                  const next = [...prev];
                  next[targetIndex] = newPhoto;
                  return next;
                });

                // Advance to next slot if available
                const nextEmptyIndex = captures.findIndex(
                  (c, idx) => idx !== targetIndex && c === null
                );
                if (nextEmptyIndex !== -1) {
                  setActiveSlotIndex(nextEmptyIndex);
                } else if (targetIndex < TOTAL_SLOTS - 1) {
                  setActiveSlotIndex(targetIndex + 1);
                }
              }
            } catch (err) {
              console.error("Capture failed:", err);
            }
            resolve();
          }
        }, 1000);
      });
    },
    [isCountingDown, activeSlotIndex, captures, selectedFilter]
  );

  // Retake slot
  const retakeSlot = useCallback(
    (slotIndex?: number) => {
      const target = slotIndex !== undefined ? slotIndex : activeSlotIndex;
      setCaptures((prev) => {
        const next = [...prev];
        next[target] = null;
        return next;
      });
      setActiveSlotIndex(target);
      setRetakesCount((prev) => prev + 1);
    },
    [activeSlotIndex]
  );

  // Generate 300 DPI composite strip
  const generateFinalStrip = useCallback(async (): Promise<string> => {
    const slotImages: SlotImage[] = [];
    for (let i = 0; i < captures.length; i++) {
      const cap = captures[i];
      if (cap) {
        slotImages.push({
          slotIndex: i,
          image: cap.processedCanvas,
          width: cap.processedCanvas.width,
          height: cap.processedCanvas.height,
        });
      }
    }

    const compositedCanvas = composite(selectedTemplate.config, slotImages, {
      showPlaceholders: true,
    });
    const dataUrl = compositedCanvas.toDataURL("image/jpeg", 0.95);
    setFinalStripDataUrl(dataUrl);
    return dataUrl;
  }, [captures, selectedTemplate]);

  // Printing simulation & trigger
  const triggerPrint = useCallback(async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintProgress(0);
    setIsPrintComplete(false);

    // Play print sound
    playPrintSound();

    // Progress animation over 3.5 seconds
    const startTime = Date.now();
    const duration = 3500;

    return new Promise<void>((resolve) => {
      const interval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));
        setPrintProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setIsPrinting(false);
          setIsPrintComplete(true);
          resolve();
        }
      }, 50);
    });
  }, [isPrinting]);

  // Reset entire photobooth session
  const resetToStart = useCallback(() => {
    setScreen("landing");
    setCaptures([null, null, null]);
    setActiveSlotIndex(0);
    setSelectedFilter(BOOTH_LUTS[0]);
    resetSessionTimer();
    setFinalStripDataUrl(null);
    setIsPrinting(false);
    setPrintProgress(0);
    setIsPrintComplete(false);
    setRetakesCount(0);
  }, [resetSessionTimer]);

  return (
    <BoothContext.Provider
      value={{
        screen,
        setScreen,
        selectedTemplate,
        setSelectedTemplate,
        selectedFilter,
        setSelectedFilter,
        captures,
        activeSlotIndex,
        setActiveSlotIndex,
        totalSlots: TOTAL_SLOTS,
        isAllSlotsFilled,
        hasAnyCapture,
        timeRemaining,
        isTimerActive,
        retakesCount,
        maxRetakes,
        startSessionTimer,
        pauseSessionTimer,
        resetSessionTimer,
        isCountingDown,
        countdownValue,
        isFlashing,
        startCaptureCountdown,
        retakeSlot,
        finalStripDataUrl,
        generateFinalStrip,
        isPrinting,
        printProgress,
        isPrintComplete,
        triggerPrint,
        resetToStart,
        backendSession,
        activeBooth,
        activePackage,
        isBackendConnected,
        adminToken,
        setAdminToken,
      }}
    >
      {children}
    </BoothContext.Provider>
  );
};

export const useBooth = () => {
  const context = useContext(BoothContext);
  if (!context) {
    throw new Error("useBooth must be used within a BoothProvider");
  }
  return context;
};
