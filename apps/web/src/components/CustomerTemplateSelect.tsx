import React from "react";
import { useBooth } from "@/context/BoothContext";
import { PHOTOBOOTH_TEMPLATES } from "@/lib/templates";
import { ArrowLeft, ArrowRight, Check, Layers, Image as ImageIcon } from "lucide-react";

export const CustomerTemplateSelect: React.FC = () => {
  const {
    setScreen,
    selectedTemplate,
    setSelectedTemplate,
    startSessionTimer,
  } = useBooth();

  const handleProceedToStudio = () => {
    startSessionTimer();
    setScreen("studio");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-zinc-900 to-neutral-950 text-white flex flex-col justify-between p-6 md:p-10 select-none">
      {/* Top Header */}
      <header className="flex justify-between items-center max-w-7xl mx-auto w-full mb-6">
        <button
          onClick={() => setScreen("landing")}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-2xl text-sm font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" /> Step 1 of 3: Choose Strip Design
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full my-auto py-2">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Select Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400">3-Photo Strip</span>
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto mt-2">
            Each strip prints 3 vertical high-resolution photos with tailored cinema framing and date stamp.
          </p>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 mb-8">
          {PHOTOBOOTH_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate.id === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`relative group cursor-pointer rounded-2xl p-3.5 transition-all duration-300 flex flex-col items-center justify-between border-2 ${
                  isSelected
                    ? "bg-zinc-850/90 border-rose-500 shadow-xl shadow-rose-500/20 scale-[1.03]"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-850/40"
                }`}
              >
                {/* Badge */}
                <div className="w-full flex justify-between items-center mb-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase"
                    style={{
                      backgroundColor: `${tmpl.accentColor}20`,
                      color: tmpl.accentColor,
                      borderColor: `${tmpl.accentColor}40`,
                      borderWidth: 1,
                    }}
                  >
                    {tmpl.badge}
                  </span>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Strip Miniature Mockup Preview (3 Vertical Slots) */}
                <div
                  className="w-24 h-56 rounded-lg p-2 flex flex-col justify-between shadow-inner relative transition-transform group-hover:scale-105 my-1"
                  style={{
                    backgroundColor: tmpl.config.canvas.background_color,
                    border: `2px solid ${tmpl.accentColor}50`,
                  }}
                >
                  {/* Slot 1 */}
                  <div
                    className="w-full h-12 rounded flex items-center justify-center overflow-hidden bg-zinc-200/40"
                    style={{
                      border: `1.5px solid ${tmpl.config.slots[0]?.border?.color || tmpl.accentColor}`,
                    }}
                  >
                    <ImageIcon className="w-3.5 h-3.5 opacity-30 text-zinc-600" />
                  </div>

                  {/* Slot 2 */}
                  <div
                    className="w-full h-12 rounded flex items-center justify-center overflow-hidden bg-zinc-200/40"
                    style={{
                      border: `1.5px solid ${tmpl.config.slots[1]?.border?.color || tmpl.accentColor}`,
                    }}
                  >
                    <ImageIcon className="w-3.5 h-3.5 opacity-30 text-zinc-600" />
                  </div>

                  {/* Slot 3 */}
                  <div
                    className="w-full h-12 rounded flex items-center justify-center overflow-hidden bg-zinc-200/40"
                    style={{
                      border: `1.5px solid ${tmpl.config.slots[2]?.border?.color || tmpl.accentColor}`,
                    }}
                  >
                    <ImageIcon className="w-3.5 h-3.5 opacity-30 text-zinc-600" />
                  </div>

                  {/* Strip Footer text */}
                  <div className="text-center pt-1">
                    <div
                      className="text-[6px] font-bold tracking-widest uppercase truncate"
                      style={{ color: tmpl.accentColor }}
                    >
                      {tmpl.name.split(" ")[0]}
                    </div>
                    <div className="text-[5px] text-zinc-500 font-mono">
                      2026.08.26
                    </div>
                  </div>
                </div>

                {/* Template Name & Category */}
                <div className="text-center mt-3 w-full">
                  <h4 className="font-bold text-xs md:text-sm text-zinc-100 truncate">
                    {tmpl.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {tmpl.category}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Strip Preview Banner & Action */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto shadow-2xl">
          <div className="flex items-center gap-4 text-left">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ backgroundColor: selectedTemplate.accentColor }}
            >
              3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {selectedTemplate.name}
                </h3>
                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                  3 Slots Strip
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {selectedTemplate.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleProceedToStudio}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold rounded-2xl shadow-xl shadow-rose-500/25 flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer text-base"
          >
            <span>Proceed to Studio</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-400 max-w-7xl mx-auto w-full pt-4 border-t border-zinc-800/60">
        You will have 4 minutes inside the studio to pose, pick LUTs, and take all 3 photos.
      </footer>
    </div>
  );
};
