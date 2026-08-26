import React, { useState } from "react";
import { useBooth } from "@/context/BoothContext";
import { api } from "@/api/client";
import { saveAuth } from "@/api/session";
import { Shield, KeyRound, User, ArrowLeft, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export const AdminLogin: React.FC = () => {
  const { setScreen, setAdminToken } = useBooth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.login(username, password);
      saveAuth("operator", response);
      setAdminToken(response.access_token);
      setScreen("admin_dashboard");
    } catch (err: unknown) {
      // Fallback for standalone demo mode if backend is not running
      if (username === "admin" && password === "admin123") {
        setAdminToken("demo_admin_token");
        setScreen("admin_dashboard");
      } else {
        setError(err instanceof Error ? err.message : "Invalid credentials. Try admin / admin123");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const autofillDemo = () => {
    setUsername("admin");
    setPassword("admin123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-zinc-900 to-neutral-950 text-white flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-md mx-auto w-full flex justify-start z-10">
        <button
          onClick={() => setScreen("landing")}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </header>

      {/* Login Card */}
      <main className="max-w-md mx-auto w-full my-auto z-10">
        <div className="bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl shadow-2xl backdrop-blur relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center shadow-lg mb-4">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h2>
            <p className="text-xs text-zinc-400 mt-1">Enter your credentials to access system telemetry & controls</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin"
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-10 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-10 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-sm"
            >
              <span>{isLoading ? "Authenticating..." : "Login to Admin"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">Demo Account Available</span>
            <button
              type="button"
              onClick={autofillDemo}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" /> Fill Credentials
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-600 z-10">
        Photobooth Security & Audit System
      </footer>
    </div>
  );
};
