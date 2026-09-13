import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Tv,
  ArrowLeft,
  Clock,
  Users,
  Building2,
  Stethoscope,
  Volume2,
  Maximize2,
  Minimize2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getLiveQueueBoardData,
  type LiveQueueBoardData,
} from "@/lib/appointments.functions";
import { SkeletonQueueBoard } from "@/components/appointments/SkeletonAppointmentCalendar";

export const Route = createFileRoute("/_authenticated/appointments/queue")({
  head: () => ({
    meta: [
      { title: "Waiting Room Live Queue Display — HospNest" },
      { name: "description", content: "High-visibility hospital waiting room live queue board with auto-refreshing patient call tickets." },
    ],
  }),
  component: LiveQueueBoardPage,
});

function LiveQueueBoardPage() {
  const { activeHospitalId } = useAppShell();
  const getQueueDataFn = useServerFn(getLiveQueueBoardData);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Query Queue Data with 15-second auto-refresh polling
  const {
    data: queueData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["live-queue-board", activeHospitalId],
    queryFn: () => getQueueDataFn({ data: activeHospitalId ? { hospitalId: activeHospitalId } : {} }),
    enabled: Boolean(activeHospitalId),
    refetchInterval: 15000, // Auto-refresh every 15s
  });

  if (isLoading) {
    return <SkeletonQueueBoard />;
  }

  const {
    hospitalName,
    currentlyServing,
    nextInLine,
    departmentQueues,
    totalWaitingToday,
    lastUpdated,
  } = queueData || {
    hospitalName: "HospNest Medical Center",
    currentlyServing: null,
    nextInLine: [],
    departmentQueues: [],
    totalWaitingToday: 0,
    lastUpdated: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 lg:p-10 selection:bg-teal-500 selection:text-black">
      {/* 1. Header Bar with Hospital Branding, Clock, and Screen Controls */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="size-10 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl">
            <Link to="/appointments">
              <ArrowLeft className="size-6" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500 text-slate-950 font-black text-sm">
                🏥
              </span>
              <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
                {hospitalName}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Live Waiting Room Queue Dispatch • Outpatient Clinics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Digital Clock */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-right">
            <div className="font-mono text-xl sm:text-2xl font-black text-teal-400 tracking-wider">
              {currentTime}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="icon"
            className="size-10 rounded-2xl border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </header>

      {/* 2. Main Center Hero: Now Serving Ticket */}
      <main className="my-auto py-8 space-y-8">
        <div className="relative overflow-hidden rounded-3xl border-2 border-teal-500/50 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-8 sm:p-12 shadow-2xl text-center space-y-6">
          {/* Glow backdrop accent */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-teal-400 animate-pulse">
            <Volume2 className="size-4" />
            Now Serving / Proceed to Clinic
          </div>

          {currentlyServing ? (
            <div className="space-y-4">
              <div className="font-mono text-7xl sm:text-9xl font-black tracking-tight text-white drop-shadow-[0_0_35px_rgba(20,184,166,0.3)]">
                #{String(currentlyServing.queueNumber).padStart(3, "0")}
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-slate-100">
                  {currentlyServing.patientName} ({currentlyServing.patientNin})
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm sm:text-base text-slate-300">
                  <span className="rounded-xl bg-slate-800/80 px-3 py-1 font-semibold text-teal-300 border border-slate-700/60">
                    Dept: {currentlyServing.departmentName}
                  </span>
                  {currentlyServing.doctorName && (
                    <span className="rounded-xl bg-slate-800/80 px-3 py-1 font-semibold text-slate-200 border border-slate-700/60">
                      Clinician: {currentlyServing.doctorName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 space-y-3">
              <div className="font-mono text-5xl font-black text-slate-500">
                NO ACTIVE TICKET
              </div>
              <p className="text-sm text-slate-400">
                All checked-in patients have been dispatched. Awaiting new arrivals from Front Desk.
              </p>
            </div>
          )}
        </div>

        {/* 3. Next In Line Sub-Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clock className="size-4 text-teal-400" /> Next In Line (Please Prepare)
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Total Waiting: {totalWaitingToday} Patients
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nextInLine.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
                No subsequent patients currently queued.
              </div>
            ) : (
              nextInLine.map((ticket, idx) => (
                <div
                  key={ticket.appointmentId}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-2 shadow-lg transition-transform hover:scale-102"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Position #{idx + 1}</span>
                    <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-400 border border-teal-500/20">
                      ~{ticket.estimatedWaitMinutes}m wait
                    </span>
                  </div>

                  <div className="font-mono text-3xl font-black text-white">
                    #{String(ticket.queueNumber).padStart(3, "0")}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-200 line-clamp-1">{ticket.patientName}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{ticket.departmentName}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 4. Footer Bar: Department Summaries & Ticker */}
      <footer className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          {departmentQueues.map((dq: any) => (
            <div key={dq.departmentId} className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-400">{dq.departmentName}:</span>
              <strong className="text-teal-400 font-mono">
                {dq.currentNumber ? `#${String(dq.currentNumber).padStart(3, "0")}` : "Idle"}
              </strong>
              <span className="text-[10px] text-slate-500">({dq.waitingCount} waiting)</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-teal-500 animate-pulse" />
          <span>Auto-refreshing every 15s • Last: {new Date(lastUpdated).toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}
