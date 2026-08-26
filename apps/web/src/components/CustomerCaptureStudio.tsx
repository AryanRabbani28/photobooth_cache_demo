import React, { useEffect, useRef, useState } from "react";
import { useBooth, BOOTH_LUTS } from "@/context/BoothContext";
import { openCamera, type CameraSource } from "@/lib/camera";
import { cssFor } from "@/lib/filters";
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  AlertCircle,
} from "lucide-react";

export const CustomerCaptureStudio: React.FC = () => {
  const {
    setScreen,
    selectedTemplate,
    selectedFilter,
    setSelectedFilter,
    captures,
    activeSlotIndex,
    setActiveSlotIndex,
    totalSlots,
    isAllSlotsFilled,
    hasAnyCapture,
    timeRemaining,
    isCountingDown,
    countdownValue,
    isFlashing,
    startCaptureCountdown,
    retakeSlot,
    generateFinalStrip,
  } = useBooth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<CameraSource | null>(null);
  const [isSynthetic, setIsSynthetic] = useState<boolean>(false);

  // Initialize camera
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        const cam = await openCamera();
        if (!isMounted) {
          cam.stop();
          return;
        }
        cameraRef.current = cam;
        setIsSynthetic(cam.status.kind === "synthetic");

        if (videoRef.current) {
          await cam.attach(videoRef.current);
        }
      } catch (err) {
        console.error("Camera init error:", err);
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Handle Start click
  const handleStartCapture = async () => {
    if (isCountingDown) return;
    await startCaptureCountdown(() => {
      if (cameraRef.current) {
        return cameraRef.current.capture();
      }
      return null;
    });
  };

  // Handle Retake click
  const handleRetake = () => {
    if (isCountingDown) return;
    retakeSlot(activeSlotIndex);
  };

  // Handle Done click
  const handleDone = async () => {
    if (isCountingDown) return;
    await generateFinalStrip();
    setScreen("preview");
  };

  // Quick slot click to select or inspect
  const handleSlotClick = (index: number) => {
    if (isCountingDown) return;
    setActiveSlotIndex(index);
  };

  const isLowTime = timeRemaining <= 60;

  return (
    <div className="h-screen max-h-screen bg-neutral-950 text-white flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none relative kiosk-surface">
      {/* Shutter Flash Animation Overlay */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none shutter-flash" />
      )}

      {/* Top Header Bar with 4-Minute Timer */}
      <header className="flex justify-between items-center bg-zinc-900/80 backdrop-blur border border-zinc-800 px-5 py-3 rounded-2xl z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                CINEMA STUDIO
              </h2>
              <span className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md font-medium border border-zinc-700">
                {selectedTemplate.name}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Slot {activeSlotIndex + 1} of {totalSlots} Active
            </p>
          </div>
        </div>

        {/* 4-Minute Session Timer & Status */}
        <div className="flex items-center gap-3 md:gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
              isLowTime
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse"
                : "bg-zinc-850/90 border-zinc-700/60 text-zinc-200"
            }`}
          >
            <Clock className={`w-4 h-4 ${isLowTime ? "text-rose-400" : "text-amber-400"}`} />
            <div className="flex flex-col text-right">
              <span className="text-xs text-zinc-400 leading-none">Session Time</span>
              <span className="text-lg md:text-xl font-mono font-bold tracking-wider leading-tight">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          {isSynthetic && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Synthetic Camera</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Studio Center Layout: [Left 3 Boxes] | [Center Cinema Box + LUTs] | [Right Round Buttons] */}
      <main className="flex-1 grid grid-cols-12 gap-4 md:gap-6 my-4 min-h-0 items-stretch">
        {/* ============================================================ */}
        {/* LEFT SIDE: 3 VERTICAL PHOTO BOXES                            */}
        {/* ============================================================ */}
        <aside className="col-span-3 lg:col-span-2 flex flex-col justify-between gap-3 min-h-0">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 px-1 shrink-0">
            <span>Strip Slots (3)</span>
          </div>

          <div className="flex flex-col justify-between flex-1 gap-3 min-h-0">
            {[0, 1, 2].map((slotIdx) => {
              const photo = captures[slotIdx];
              const isActive = activeSlotIndex === slotIdx;

              return (
                <div
                  key={slotIdx}
                  onClick={() => handleSlotClick(slotIdx)}
                  className={`relative flex-1 min-h-0 rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer flex flex-col items-center justify-center group ${
                    isActive
                      ? "border-rose-500 bg-zinc-850/80 shadow-lg shadow-rose-500/15 scale-[1.02]"
                      : photo
                      ? "border-zinc-700 bg-zinc-900/90 hover:border-zinc-500"
                      : "border-dashed border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  {/* Slot Number Badge */}
                  <div
                    className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow ${
                      photo
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-rose-500 text-white animate-pulse"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {photo ? <CheckCircle2 className="w-3.5 h-3.5" /> : slotIdx + 1}
                  </div>

                  {photo ? (
                    /* Captured Photo Thumbnail */
                    <div className="w-full h-full relative">
                      <img
                        src={photo.dataUrl}
                        alt={`Slot ${slotIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[10px] text-zinc-200 font-medium">
                          {photo.filterName} • Tap to select
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Blank / Empty Placeholder Slot */
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${
                          isActive ? "bg-rose-500/20 text-rose-400" : "bg-zinc-800/60 text-zinc-600"
                        }`}
                      >
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-400">
                        {isActive ? "Ready for Shot" : `Photo ${slotIdx + 1}`}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {isActive ? "Press START" : "Blank"}
                      </span>
                    </div>
                  )}

                  {/* Active Indicator Pulse Ring */}
                  {isActive && (
                    <div className="absolute inset-0 border-2 border-rose-500 rounded-2xl pointer-events-none animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ============================================================ */}
        {/* CENTER: CINEMA VIEW & LUTS BAR                               */}
        {/* ============================================================ */}
        <section className="col-span-6 lg:col-span-8 flex flex-col justify-between gap-3 min-h-0">
          <div className="flex justify-between items-end px-1 shrink-0">
            <div className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Live View
            </div>
          </div>

          <div className="relative flex-1 min-h-0 bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col items-center justify-center">
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain scale-x-[-1]" // Mirror camera, use object-contain so it never overflows
              style={{ filter: cssFor(selectedFilter) }}
            />

            {/* Countdown Overlay (3, 2, 1, SMILE!) */}
            {isCountingDown && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-30 animate-in fade-in zoom-in duration-200">
                <div className="text-center">
                  {countdownValue > 0 ? (
                    <div className="text-8xl md:text-9xl font-black text-white drop-shadow-[0_0_35px_rgba(244,63,94,0.8)] animate-bounce">
                      {countdownValue}
                    </div>
                  ) : (
                    <div className="text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-400 to-pink-500 drop-shadow-[0_0_40px_rgba(251,191,36,0.9)] animate-pulse">
                      SMILE! 📸
                    </div>
                  )}
                  <p className="text-sm font-semibold tracking-widest text-zinc-300 uppercase mt-4">
                    Capturing Slot {activeSlotIndex + 1}
                  </p>
                </div>
              </div>
            )}

            {/* Cinema Frame Corner Guides */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/40 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/40 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/40 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/40 rounded-br-lg pointer-events-none" />

            {/* Active LUT Badge Overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5 pointer-events-none z-20">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Filter: <strong>{selectedFilter.name}</strong></span>
            </div>
          </div>

          {/* BELOW THE BOX: LUTS / FILTER SELECTION BAR */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 shrink-0">
              <Sliders className="w-3.5 h-3.5 text-rose-400" />
              <span>LUTs:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {BOOTH_LUTS.map((lut) => {
                const isSelected = selectedFilter.id === lut.id;
                return (
                  <button
                    key={lut.id}
                    onClick={() => setSelectedFilter(lut)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/25 scale-105"
                        : "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                    }`}
                  >
                    <span>{lut.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* RIGHT SIDE: DYNAMIC ROUND BUTTONS (START, RETAKE, DONE)       */}
        {/* ============================================================ */}
        <aside className="col-span-3 lg:col-span-2 h-full flex flex-col justify-between items-center py-2">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">
            Controls
          </div>

          <div className="flex flex-col items-center gap-6 my-auto">
            {/* TOP ROUND BUTTON: START */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleStartCapture}
                disabled={isCountingDown}
                className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 hover:from-rose-500 hover:to-amber-300 text-white font-extrabold text-lg md:text-xl shadow-2xl shadow-rose-500/40 flex flex-col items-center justify-center gap-1 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer border-4 border-white/20"
              >
                <Camera className="w-7 h-7 md:w-8 md:h-8" />
                <span className="tracking-wide text-sm md:text-base">Start</span>
              </button>
              <span className="text-[11px] text-zinc-400 font-medium mt-1.5">
                Take Photo
              </span>
            </div>

            {/* BUTTON BELOW IT: RETAKE */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleRetake}
                disabled={isCountingDown || !captures[activeSlotIndex]}
                className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm shadow-lg border-2 border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center gap-1 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                <span className="text-xs">Retake</span>
              </button>
              <span className="text-[10px] text-zinc-500 mt-1">
                Slot {activeSlotIndex + 1}
              </span>
            </div>
          </div>

          {/* RIGHT BOTTOM CORNER: DONE */}
          <div className="w-full flex justify-center pb-2">
            <button
              onClick={handleDone}
              disabled={isCountingDown || !hasAnyCapture}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm md:text-base shadow-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                isAllSlotsFilled
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 scale-[1.02] animate-pulse"
                  : hasAnyCapture
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                  : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Done</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};
