import React, { useEffect, useState } from "react";
import { useBooth } from "@/context/BoothContext";
import {
  Printer,
  RotateCcw,
  Download,
  Home,
  CheckCircle,
  Sparkles,
  Heart,
} from "lucide-react";

export const CustomerFinalPreview: React.FC = () => {
  const {
    setScreen,
    finalStripDataUrl,
    generateFinalStrip,
    isPrinting,
    printProgress,
    isPrintComplete,
    triggerPrint,
    resetToStart,
  } = useBooth();

  const [stripSrc, setStripSrc] = useState<string | null>(finalStripDataUrl);

  // Ensure high-resolution strip is composited
  useEffect(() => {
    if (!finalStripDataUrl) {
      generateFinalStrip().then((url) => setStripSrc(url));
    } else {
      setStripSrc(finalStripDataUrl);
    }
  }, [finalStripDataUrl, generateFinalStrip]);

  // Handle Retake (go back to studio)
  const handleRetake = () => {
    setScreen("studio");
  };

  // Handle Download
  const handleDownload = () => {
    if (!stripSrc) return;
    const a = document.createElement("a");
    a.href = stripSrc;
    a.download = `photobooth_strip_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-zinc-900 to-neutral-950 text-white flex flex-col justify-between p-6 md:p-10 select-none overflow-y-auto">
      {/* Top Header */}
      <header className="flex justify-between items-center max-w-6xl mx-auto w-full mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Your Photo Strip is Ready!</h2>
            <p className="text-xs text-zinc-400">300 DPI Studio Quality Vertical Strip</p>
          </div>
        </div>

        <button
          onClick={resetToStart}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" /> Start New
        </button>
      </header>

      {/* Main Grid: [Left/Center: Full Strip Preview] | [Right Side Controls Box] */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-6xl mx-auto w-full my-auto items-center py-4">
        {/* ============================================================ */}
        {/* LEFT / CENTER: THE WHOLE PHOTO STRIP                         */}
        {/* ============================================================ */}
        <section className="md:col-span-6 lg:col-span-7 flex justify-center items-center">
          <div className="relative group p-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-3xl shadow-2xl">
            {/* The Assembled Strip */}
            {stripSrc ? (
              <div className="relative max-h-[72vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-zinc-800 transition-transform duration-300 group-hover:scale-[1.01]">
                <img
                  src={stripSrc}
                  alt="Assembled Photobooth Strip"
                  className="max-h-[72vh] w-auto object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-64 h-96 bg-zinc-800 animate-pulse rounded-2xl flex items-center justify-center text-zinc-500 text-sm">
                Generating strip...
              </div>
            )}

            {/* Floating Resolution Badge */}
            <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-[11px] text-zinc-300 font-mono">
              300 DPI • 1200×1800
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* RIGHT SIDE: PRINT BOX, RETAKE OPTION & EXTRAS               */}
        {/* ============================================================ */}
        <aside className="md:col-span-6 lg:col-span-5 flex flex-col gap-5">
          {/* Main Action Box: PRINT */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-lg text-white">Physical Print</h3>
              </div>
              <span className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full font-medium">
                DNP Thermal Photo Paper
              </span>
            </div>

            <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
              Your 3-photo strip will be printed instantly on premium glossy thermal photo paper.
            </p>

            {/* Printing Progress Indicator */}
            {isPrinting && (
              <div className="mb-6 space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between text-xs text-zinc-300 font-medium">
                  <span className="flex items-center gap-1.5 text-amber-400 animate-pulse">
                    <Printer className="w-3.5 h-3.5" /> Printing in progress...
                  </span>
                  <span className="font-mono">{printProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden border border-zinc-700">
                  <div
                    className="bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 h-full transition-all duration-100 ease-out"
                    style={{ width: `${printProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Print Complete Success Banner */}
            {isPrintComplete && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-in zoom-in-95">
                <CheckCircle className="w-6 h-6 shrink-0 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-200">Print Dispatched!</h4>
                  <p className="text-xs text-emerald-400/90 mt-0.5">
                    Please collect your strip from the booth dispenser tray below.
                  </p>
                </div>
              </div>
            )}

            {/* PRINT BUTTON */}
            <button
              onClick={triggerPrint}
              disabled={isPrinting}
              className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-extrabold rounded-2xl shadow-xl shadow-rose-500/25 flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer text-base"
            >
              <Printer className="w-5 h-5" />
              <span>{isPrinting ? "Printing..." : isPrintComplete ? "Print Another Copy" : "Print Strip"}</span>
            </button>
          </div>

          {/* RETAKE OPTION BOX */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-white">Want to change something?</h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                You can retake any of your 3 photos or choose a different LUT.
              </p>
            </div>

            <button
              onClick={handleRetake}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold rounded-xl text-xs flex items-center gap-2 border border-zinc-700 transition-all cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Retake</span>
            </button>
          </div>

          {/* DIGITAL DOWNLOAD & SHARE */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              className="p-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Save Image</span>
            </button>

            <button
              onClick={resetToStart}
              className="p-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Finish Session</span>
            </button>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-500 max-w-6xl mx-auto w-full pt-4 border-t border-zinc-800/60">
        Thank you for visiting! High-resolution output rendered client-side at 300 DPI.
      </footer>
    </div>
  );
};
