import React from "react";
import { useBooth } from "@/context/BoothContext";
import { Camera, Sparkles, Shield, ArrowRight, Film, Heart } from "lucide-react";

const PolaroidCameraIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 240" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <rect x="10" y="30" width="180" height="200" rx="15" fill="#f4f4f5"/>
    <rect x="10" y="30" width="180" height="200" rx="15" fill="black" fillOpacity="0.05" />
    {/* Rainbow stripe */}
    <path d="M88 30 h 4 v 200 h -4 z" fill="#ef4444" />
    <path d="M92 30 h 4 v 200 h -4 z" fill="#f97316" />
    <path d="M96 30 h 4 v 200 h -4 z" fill="#eab308" />
    <path d="M100 30 h 4 v 200 h -4 z" fill="#22c55e" />
    <path d="M104 30 h 4 v 200 h -4 z" fill="#3b82f6" />
    <path d="M108 30 h 4 v 200 h -4 z" fill="#a855f7" />
    {/* Lens housing */}
    <circle cx="100" cy="140" r="60" fill="#27272a"/>
    {/* Lens reflection */}
    <circle cx="100" cy="140" r="45" fill="#18181b"/>
    <circle cx="85" cy="125" r="15" fill="#3f3f46"/>
    {/* Viewfinder */}
    <rect x="30" y="50" width="30" height="30" rx="5" fill="#27272a"/>
    <circle cx="45" cy="65" r="8" fill="#18181b"/>
    {/* Flash */}
    <rect x="130" y="50" width="40" height="30" rx="5" fill="#e4e4e7"/>
    <rect x="135" y="55" width="30" height="20" rx="3" fill="#fef08a"/>
    {/* Output Slot */}
    <rect x="30" y="210" width="140" height="8" rx="4" fill="#18181b"/>
  </svg>
);

export const LandingPage: React.FC = () => {
  const { setScreen, isBackendConnected } = useBooth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-zinc-900 to-neutral-950 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden select-none">
      {/* Ambient background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Polaroid Cameras Peeking In */}
      <PolaroidCameraIcon className="absolute top-1/2 -left-28 md:-left-16 -translate-y-1/2 rotate-[15deg] w-64 md:w-[350px] opacity-20 pointer-events-none drop-shadow-2xl z-0" />
      <PolaroidCameraIcon className="absolute top-1/2 -right-28 md:-right-16 -translate-y-1/2 -rotate-[15deg] w-64 md:w-[350px] opacity-20 pointer-events-none drop-shadow-2xl z-0 scale-x-[-1]" />

      {/* Header */}
      <header className="flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400 font-sans">
              CACHE
            </h1>
            <p className="text-xs text-zinc-400 tracking-widest uppercase">
              Professional 3-Photo Strip Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur border border-zinc-800 px-3.5 py-1.5 rounded-full text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-zinc-300 font-medium">
            {isBackendConnected ? "Booth Online • Ready" : "Standalone Demo Mode"}
          </span>
        </div>
      </header>

      {/* Main Center Cards */}
      <main className="my-auto z-10 max-w-5xl mx-auto w-full py-8">
        <div className="text-center mb-10 md:mb-14">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Tap to Start Your Experience
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mt-1">
            Capture Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400">Memories</span>
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto mt-3">
            Step in, choose your favourite aesthetic strip template, apply cinematic LUT filters, and print high-res 300 DPI strips.
          </p>
        </div>

        {/* The Two Main Action Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Customer Panel Card */}
          <button
            onClick={() => setScreen("template_select")}
            className="group relative text-left bg-gradient-to-b from-zinc-850 to-zinc-900/90 border-2 border-rose-500/40 hover:border-rose-400 p-8 md:p-10 rounded-3xl transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-rose-500/20 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[300px] z-10"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500" />
            
            <div className="space-y-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
                <Film className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-rose-400">
                  Touch Screen Interactive
                </span>
                <h3 className="text-3xl font-extrabold text-white mt-1 group-hover:text-rose-200 transition-colors">
                  Customer Panel
                </h3>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed">
                Choose from custom 3-photo vertical strip templates, select cinematic LUTs, take your shots, and print instantly!
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/80 relative z-10">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> 3 Photos • 4 Min Studio
              </div>
              <div className="flex items-center gap-2 font-bold text-rose-400 group-hover:text-rose-300 text-sm">
                <span>Start Session</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Admin Card (Labeled exactly "Admin" as requested) */}
          <button
            onClick={() => setScreen("admin_login")}
            className="group relative text-left bg-gradient-to-b from-zinc-850 to-zinc-900/90 border border-zinc-700/60 hover:border-zinc-500 p-8 md:p-10 rounded-3xl transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-cyan-500/10 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[300px] z-10"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-all duration-500" />

            <div className="space-y-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-cyan-400" />
              </div>

              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">
                  Authorized Personnel Only
                </span>
                <h3 className="text-3xl font-extrabold text-white mt-1 group-hover:text-cyan-200 transition-colors">
                  Admin
                </h3>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed">
                System telemetry, printer paper levels, hardware diagnostics, session logs, live booth controls, and analytics.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/80 relative z-10">
              <span className="text-xs text-zinc-400 font-medium">
                Password Protected
              </span>
              <div className="flex items-center gap-2 font-bold text-zinc-300 group-hover:text-cyan-300 text-sm">
                <span>Manage Booth</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-400 z-10 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 max-w-5xl mx-auto w-full border-t border-zinc-800/60">
        <div>Photobooth Management System • Ultra 300 DPI Strip Engine</div>
        <div>Default Admin Login: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">admin</code> / <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">admin123</code></div>
      </footer>
    </div>
  );
};
