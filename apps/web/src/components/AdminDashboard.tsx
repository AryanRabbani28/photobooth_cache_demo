import React, { useEffect, useState, useCallback } from "react";
import { useBooth } from "@/context/BoothContext";
import { clearAuth } from "@/api/session";
import { api, type OverviewStats, type Booth, type Session, type LogEntry } from "@/api/client";
import {
  Shield,
  Activity,
  Printer,
  Camera,
  Server,
  RefreshCw,
  LogOut,
  Sliders,
  Clock,
  TrendingUp,
  Layers,
  Lock,
  Unlock,
  FileText,
} from "lucide-react";


export const AdminDashboard: React.FC = () => {
  const { setScreen, adminToken, setAdminToken } = useBooth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [printerFailArmed, setPrinterFailArmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "booths" | "sessions" | "hardware" | "templates">("overview");

  // Load telemetry
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (adminToken && adminToken !== "demo_admin_token") {
        const [overviewRes, boothsRes, sessionsRes, logsRes] = await Promise.allSettled([
          api.overview(adminToken),
          api.booths(adminToken),
          api.sessions(adminToken, { limit: 10 }),
          api.logs(adminToken, 20),
        ]);

        if (overviewRes.status === "fulfilled") setStats(overviewRes.value);
        if (boothsRes.status === "fulfilled") setBooths(boothsRes.value);
        if (sessionsRes.status === "fulfilled") setRecentSessions(sessionsRes.value);
        if (logsRes.status === "fulfilled") setLogs(logsRes.value);
      } else {
        // Mock data for presentation/demo mode
        setStats({
          total_booths: 2,
          online_booths: 2,
          offline_booths: 0,
          active_sessions: 1,
          sessions_today: 42,
          photos_today: 126,
          prints_today: 40,
          errors_today: 0,
          top_locations: [
            { location: "Bashundhara City", sessions: 28 },
            { location: "Centre Point", sessions: 14 },
          ],
          popular_templates: [
            { template: "Classic Studio Strip", uses: 22 },
            { template: "Midnight Noir Strip", uses: 12 },
            { template: "Cyber Neon Glow", uses: 8 },
          ],
          popular_filters: [
            { filter: "Vintage", uses: 18 },
            { filter: "Black & White", uses: 15 },
            { filter: "Normal", uses: 9 },
          ],
        });

        setBooths([
          {
            id: "b1",
            name: "Booth 01",
            booth_code: "BC-01",
            device_id: "DEVICE_9832",
            status: "ONLINE",
            last_seen: new Date().toISOString(),
            app_version: "2.4.0",
            location_name: "Bashundhara City, Panthapath",
            device_status: {
              camera_status: "CONNECTED",
              camera_model: "Sony A6400 (3:2 4K)",
              printer_status: "READY",
              printer_model: "DNP DS620A (Glossy)",
              internet_status: "EXCELLENT",
              disk_free_mb: 45200,
              app_version: "2.4.0",
              updated_at: new Date().toISOString(),
            },
            active_session_id: "sess_active_01",
          },
          {
            id: "b2",
            name: "Booth 01",
            booth_code: "CP-01",
            device_id: "DEVICE_4521",
            status: "ONLINE",
            last_seen: new Date().toISOString(),
            app_version: "2.4.0",
            location_name: "Centre Point, Uttara",
            device_status: {
              camera_status: "CONNECTED",
              camera_model: "Webcam / DSLR Fallback",
              printer_status: "READY",
              printer_model: "Citizen CX-02",
              internet_status: "GOOD",
              disk_free_mb: 38400,
              app_version: "2.4.0",
              updated_at: new Date().toISOString(),
            },
            active_session_id: null,
          },
        ]);

        setRecentSessions([
          {
            id: "sess_8912",
            booth_id: "b1",
            booth_code: "BC-01",
            operator_id: "op1",
            operator_name: "Rahim Uddin",
            package_id: "p1",
            package_name: "Standard 3-Strip",
            template_id: "t1",
            template_name: "Classic Studio Strip",
            customer_name: "Tanzim & Friends",
            status: "COMPLETED",
            allocated_time: 240,
            remaining_time: 0,
            total_photos: 3,
            photos_captured: 3,
            retakes_used: 1,
            max_retakes: 3,
            number_of_prints: 2,
            started_at: new Date(Date.now() - 15 * 60000).toISOString(),
            ended_at: new Date(Date.now() - 11 * 60000).toISOString(),
            created_at: new Date(Date.now() - 16 * 60000).toISOString(),
            photo_count: 3,
            final_output_id: "out_8912",
            final_output_path: "strips/2026-08-26/sess_8912.jpg",
          },
          {
            id: "sess_8911",
            booth_id: "b2",
            booth_code: "CP-01",
            operator_id: "op2",
            operator_name: "Karim Hossain",
            package_id: "p2",
            package_name: "Premium Cinema Strip",
            template_id: "t2",
            template_name: "Midnight Noir Strip",
            customer_name: "Ayesha",
            status: "COMPLETED",
            allocated_time: 240,
            remaining_time: 0,
            total_photos: 3,
            photos_captured: 3,
            retakes_used: 0,
            max_retakes: 3,
            number_of_prints: 2,
            started_at: new Date(Date.now() - 32 * 60000).toISOString(),
            ended_at: new Date(Date.now() - 28 * 60000).toISOString(),
            created_at: new Date(Date.now() - 33 * 60000).toISOString(),
            photo_count: 3,
            final_output_id: "out_8911",
            final_output_path: "strips/2026-08-26/sess_8911.jpg",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    clearAuth("operator");
    setAdminToken(null);
    setScreen("landing");
  };

  const togglePrinterFailure = async () => {
    if (adminToken && adminToken !== "demo_admin_token") {
      try {
        const next = !printerFailArmed;
        await api.setPrinterFailure(adminToken, next);
        setPrinterFailArmed(next);
      } catch (err) {
        console.error("Printer toggle error:", err);
      }
    } else {
      setPrinterFailArmed(!printerFailArmed);
    }
  };

  return (
    <div className="h-screen w-full bg-neutral-950 text-white flex flex-col select-none overflow-y-auto overflow-x-hidden">
      {/* Top Navbar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>Admin Management Portal</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md font-mono">
                v2.4.0
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Photobooth Network Central Operations</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3.5 py-2 rounded-xl text-xs font-medium border border-zinc-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={() => setScreen("landing")}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3.5 py-2 rounded-xl text-xs font-medium border border-zinc-700 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Back to Booth</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-full px-8 py-6 space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-3">
          {[
            { id: "overview", label: "Overview & Analytics", icon: Activity },
            { id: "booths", label: "Booth Fleet", icon: Server },
            { id: "sessions", label: "Session History", icon: Clock },
            { id: "hardware", label: "Hardware & Diagnostics", icon: Sliders },
            { id: "templates", label: "Template Manager", icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? "bg-zinc-800 text-white border border-zinc-700 shadow"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                  <span>Active Booths</span>
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {stats?.online_booths ?? 2} / {stats?.total_booths ?? 2}
                </div>
                <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-block">
                  ● 100% Fleet Online
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                  <span>Sessions Today</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {stats?.sessions_today ?? 42}
                </div>
                <span className="text-[11px] text-cyan-400 font-medium mt-1 inline-block">
                  +14% vs yesterday
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                  <span>Photos Captured</span>
                  <Camera className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {stats?.photos_today ?? 126}
                </div>
                <span className="text-[11px] text-zinc-400 font-medium mt-1 inline-block">
                  3 photos per strip
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                  <span>Prints Dispatched</span>
                  <Printer className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {stats?.prints_today ?? 40}
                </div>
                <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-block">
                  0 Print Failures
                </span>
              </div>
            </div>

            {/* Popular Templates & LUTs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
                <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  <span>Popular Strip Templates</span>
                </h3>
                <div className="space-y-3">
                  {stats?.popular_templates?.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-300 font-medium">{t.template}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${(t.uses / 25) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-zinc-400">{t.uses} strips</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
                <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Most Used LUT Filters</span>
                </h3>
                <div className="space-y-3">
                  {stats?.popular_filters?.map((f, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-300 font-medium">{f.filter}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full"
                            style={{ width: `${(f.uses / 25) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-zinc-400">{f.uses} uses</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: BOOTH FLEET */}
        {activeTab === "booths" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {booths.map((booth) => (
                <div
                  key={booth.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{booth.name}</h3>
                        <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded font-mono border border-zinc-700">
                          {booth.booth_code}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{booth.location_name}</p>
                    </div>

                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {booth.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 text-xs">
                    <div className="bg-zinc-850 p-3 rounded-xl">
                      <span className="text-zinc-500 block mb-1">Camera Unit</span>
                      <span className="font-semibold text-zinc-200">
                        {booth.device_status?.camera_model ?? "Sony A6400"}
                      </span>
                    </div>
                    <div className="bg-zinc-850 p-3 rounded-xl">
                      <span className="text-zinc-500 block mb-1">Dye-Sub Printer</span>
                      <span className="font-semibold text-zinc-200">
                        {booth.device_status?.printer_model ?? "DNP DS620A"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-zinc-500">
                      Disk: {booth.device_status?.disk_free_mb ? `${Math.round(booth.device_status.disk_free_mb / 1024)} GB Free` : "OK"}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => alert(`Locking booth ${booth.booth_code}`)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 cursor-pointer flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" /> Lock
                      </button>
                      <button
                        onClick={() => alert(`Unlocked booth ${booth.booth_code}`)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 cursor-pointer flex items-center gap-1"
                      >
                        <Unlock className="w-3 h-3" /> Unlock
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: SESSION HISTORY */}
        {activeTab === "sessions" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow">
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">Recent Customer Sessions</h3>
              <span className="text-xs text-zinc-500">Auto-synced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-850/60 text-zinc-400 font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-4 px-6">Session ID</th>
                    <th className="py-4 px-6">Booth</th>
                    <th className="py-4 px-6">Template</th>
                    <th className="py-4 px-6">Photos / Retakes</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {recentSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-850/40">
                      <td className="py-4 px-6 font-mono text-cyan-400 font-medium">{s.id}</td>
                      <td className="py-4 px-6 font-medium">{s.booth_code}</td>
                      <td className="py-4 px-6">{s.template_name || "Classic Strip"}</td>
                      <td className="py-4 px-6">
                        {s.photos_captured} photos ({s.retakes_used} retakes)
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-zinc-400 font-mono">
                        {s.allocated_time}s allocated
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: HARDWARE & DIAGNOSTICS */}
        {activeTab === "hardware" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Printer Status Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base text-white">DNP Dye-Sublimation Printer</h3>
                </div>
                <span className="bg-emerald-500/10 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-semibold">
                  ONLINE
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Glossy Paper Roll</span>
                    <span className="font-mono text-zinc-200">350 / 400 prints (88%)</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "88%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">YMC+OP Thermal Ribbon</span>
                    <span className="font-mono text-zinc-200">92% remaining</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: "92%" }} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-zinc-300 block">
                    Simulate Printer Jam
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Fails the next print job to test error recovery
                  </span>
                </div>

                <button
                  onClick={togglePrinterFailure}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    printerFailArmed
                      ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {printerFailArmed ? "ARMED (Jam Next)" : "Disarmed (Normal)"}
                </button>
              </div>
            </div>

            {/* Camera Diagnostics Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-base text-white">Camera Subsystem</h3>
                </div>
                <span className="bg-emerald-500/10 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-semibold">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Capture Target</span>
                  <span className="font-mono">1080×720 (3:2 Aspect)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Composite Target</span>
                  <span className="font-mono">1200×1800 (300 DPI 4x6in)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Fallback Source</span>
                  <span className="font-mono">Synthetic Test Pattern</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-400">Shutter Latency</span>
                  <span className="font-mono text-emerald-400">&lt; 20ms</span>
                </div>
              </div>
            </div>

            {/* System Activity Logs Card */}
            <div className="col-span-1 md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-base text-white">System Activity & Audit Logs</h3>
                </div>
                <span className="text-xs text-zinc-500 font-mono">Live Buffer</span>
              </div>

              <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 py-1 text-zinc-300">
                      <span className="text-zinc-500 shrink-0">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <span
                        className={`font-bold px-1 rounded text-[10px] ${
                          log.level === "ERROR"
                            ? "bg-rose-500/20 text-rose-300"
                            : log.level === "WARNING"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-zinc-400 shrink-0">[{log.source ?? "SYS"}]</span>
                      <span className="truncate">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-1.5 text-zinc-400 text-[11px]">
                    <div className="flex gap-2">
                      <span className="text-zinc-500">{new Date().toLocaleTimeString()}</span>
                      <span className="text-emerald-400 font-bold">[INFO]</span>
                      <span>Booth BC-01 heartbeat received (100% telemetry healthy)</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-zinc-500">{new Date(Date.now() - 60000).toLocaleTimeString()}</span>
                      <span className="text-cyan-400 font-bold">[INFO]</span>
                      <span>DNP DS620A thermal printer driver ready (350 prints remaining)</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-zinc-500">{new Date(Date.now() - 120000).toLocaleTimeString()}</span>
                      <span className="text-cyan-400 font-bold">[INFO]</span>
                      <span>Compositor calibrated at 300 DPI (1200x1800 resolution)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">Template Management</h2>
                <p className="text-sm text-zinc-400">Upload new layout configurations and design assets to the fleet.</p>
              </div>
              <button className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-semibold transition cursor-pointer">
                <span className="text-xl leading-none">+</span>
                Upload Template (.zip/.json)
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold mb-4 text-zinc-300">Currently Deployed Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Just mock representations */}
                {[
                  { name: "Spider-Man Edition", category: "Pop Culture", status: "Active" },
                  { name: "The Dark Knight", category: "Pop Culture", status: "Active" },
                  { name: "Odysseus Epic", category: "Mythology", status: "Active" },
                  { name: "Classic Studio Strip", category: "Classic", status: "Active" }
                ].map((t) => (
                  <div key={t.name} className="border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-zinc-200">{t.name}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                        {t.status}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">{t.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900/60 border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-500 shrink-0 mt-auto">
        Photobooth System Dashboard • All hardware drivers active
      </footer>
    </div>
  );
};

