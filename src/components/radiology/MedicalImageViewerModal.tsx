import React, { useState, useRef } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FlipHorizontal,
  Maximize2,
  Minus,
  Move,
  Plus,
  RefreshCw,
  RotateCw,
  Ruler,
  Sliders,
  Sun,
  X,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RadiologyStudyItem } from "@/lib/radiology.functions";

interface MedicalImageViewerModalProps {
  study: RadiologyStudyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName?: string;
  patientNin?: string;
}

export function MedicalImageViewerModal({
  study,
  open,
  onOpenChange,
  patientName = "Patient",
  patientNin,
}: MedicalImageViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isInverted, setIsInverted] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  if (!study) return null;

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setIsFlipped(false);
    setBrightness(100);
    setContrast(100);
    setIsInverted(false);
    setPanPosition({ x: 0, y: 0 });
    setMeasurePoints([]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMeasureMode) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (measurePoints.length >= 2) {
        setMeasurePoints([{ x, y }]);
      } else {
        setMeasurePoints([...measurePoints, { x, y }]);
      }
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isMeasureMode) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate distance between points in pixels
  const measuredDistance =
    measurePoints.length === 2
      ? Math.round(
          Math.sqrt(
            Math.pow(measurePoints[1]!.x - measurePoints[0]!.x, 2) +
              Math.pow(measurePoints[1]!.y - measurePoints[0]!.y, 2)
          ) * 0.264
        ) // approx mm calibration
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] h-[90vh] p-0 gap-0 bg-slate-950 text-slate-100 border border-slate-800 flex flex-col overflow-hidden">
        {/* Top Diagnostic Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 font-bold text-xs uppercase">
              {study.modality}
            </span>
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <span>{study.bodyPart}</span>
                <Badge variant="outline" className="text-[10px] uppercase border-slate-700 text-slate-300 py-0">
                  {study.modality.toUpperCase()}
                </Badge>
                {study.isCritical && (
                  <Badge variant="destructive" className="text-[10px] uppercase py-0 bg-rose-600">
                    Critical Finding
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Patient: {patientName} {patientNin ? `(${patientNin})` : ""} • Date:{" "}
                {new Date(study.studyDate).toLocaleDateString("en-GB", { dateStyle: "medium" })}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs gap-1"
            >
              <RefreshCw className="size-3" /> Reset View
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="size-8 text-slate-400 hover:text-white"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Main Workspace (Viewport + Inspection Panel) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left / Center: Medical Image Canvas Viewport */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex-1 relative bg-black flex items-center justify-center overflow-hidden select-none ${
              isMeasureMode ? "cursor-crosshair" : isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* Image Canvas with Filters & Transforms */}
            <div
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${
                  isFlipped ? -1 : 1
                })`,
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${
                  isInverted ? "invert(100%) hue-rotate(180deg)" : ""
                }`,
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
              className="max-w-full max-h-full flex items-center justify-center origin-center"
            >
              <img
                src={study.imageUrl}
                alt={`${study.modality} of ${study.bodyPart}`}
                className="max-w-[80vw] max-h-[72vh] object-contain pointer-events-none rounded shadow-2xl"
              />
            </div>

            {/* Measurement Caliper Overlay */}
            {measurePoints.map((pt, i) => (
              <div
                key={i}
                style={{ left: pt.x - 5, top: pt.y - 5 }}
                className="absolute size-2.5 rounded-full bg-teal-400 border border-white shadow-lg pointer-events-none z-10"
              />
            ))}

            {measurePoints.length === 2 && (
              <svg className="absolute inset-0 pointer-events-none size-full z-10">
                <line
                  x1={measurePoints[0]!.x}
                  y1={measurePoints[0]!.y}
                  x2={measurePoints[1]!.x}
                  y2={measurePoints[1]!.y}
                  stroke="#2dd4bf"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <text
                  x={(measurePoints[0]!.x + measurePoints[1]!.x) / 2 + 8}
                  y={(measurePoints[0]!.y + measurePoints[1]!.y) / 2 - 8}
                  fill="#2dd4bf"
                  fontSize="12"
                  fontWeight="bold"
                  className="font-mono bg-black/80 px-1 rounded"
                >
                  ~{measuredDistance} mm
                </text>
              </svg>
            )}

            {/* Viewport Info OSD (On-Screen Display) */}
            <div className="absolute top-4 left-4 pointer-events-none space-y-1 text-[11px] font-mono text-teal-400/90 bg-black/60 backdrop-blur-xs p-2 rounded border border-teal-500/20">
              <p className="font-bold uppercase tracking-wider">{study.bodyPart}</p>
              <p>Zoom: {Math.round(zoom * 100)}%</p>
              <p>Rotation: {rotation}°</p>
              <p>Window: {brightness}% B / {contrast}% C</p>
              {isInverted && <p className="text-amber-400 font-bold">Negative Film View</p>}
            </div>

            {/* Floating Image Control Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 shadow-2xl z-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="size-7 text-slate-300 hover:text-white"
                title="Zoom Out"
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="text-[11px] font-mono text-slate-300 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="size-7 text-slate-300 hover:text-white"
                title="Zoom In"
              >
                <Plus className="size-3.5" />
              </Button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="size-7 text-slate-300 hover:text-white"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFlipped((f) => !f)}
                className="size-7 text-slate-300 hover:text-white"
                title="Flip Horizontal"
              >
                <FlipHorizontal className="size-3.5" />
              </Button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <Button
                variant={isInverted ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsInverted((i) => !i)}
                className={`h-7 text-xs font-semibold px-2 ${
                  isInverted ? "bg-teal-600 text-white" : "text-slate-300 hover:text-white"
                }`}
                title="Toggle Inverted Negative X-Ray Film"
              >
                Negative Film
              </Button>

              <Button
                variant={isMeasureMode ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setIsMeasureMode(!isMeasureMode);
                  setMeasurePoints([]);
                }}
                className={`h-7 text-xs font-semibold px-2 gap-1 ${
                  isMeasureMode ? "bg-teal-600 text-white" : "text-slate-300 hover:text-white"
                }`}
                title="Caliper Distance Measurement"
              >
                <Ruler className="size-3" /> Measure
              </Button>
            </div>
          </div>

          {/* Right Inspection & Radiologist Report Drawer */}
          <div className="w-80 border-l border-slate-800 bg-slate-900/95 flex flex-col p-5 overflow-y-auto space-y-6 shrink-0">
            {/* Window Leveling Controls */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Sliders className="size-3.5" /> Image Enhancement
              </h3>

              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Brightness</span>
                    <span className="font-mono">{brightness}%</span>
                  </div>
                  <Slider
                    value={[brightness]}
                    min={40}
                    max={180}
                    step={5}
                    onValueChange={(v) => setBrightness(v[0] || 100)}
                    className="py-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Contrast</span>
                    <span className="font-mono">{contrast}%</span>
                  </div>
                  <Slider
                    value={[contrast]}
                    min={50}
                    max={250}
                    step={5}
                    onValueChange={(v) => setContrast(v[0] || 100)}
                    className="py-1"
                  />
                </div>
              </div>
            </div>

            {/* Diagnostic Report Section */}
            <div className="space-y-4 border-t border-slate-800 pt-5 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <FileText className="size-3.5" /> Radiologist Report
              </h3>

              {study.clinicalIndication && (
                <div>
                  <span className="text-slate-400 block font-medium">Clinical Indication:</span>
                  <p className="text-slate-200 mt-0.5">{study.clinicalIndication}</p>
                </div>
              )}

              <div>
                <span className="text-slate-400 block font-medium">Radiological Findings:</span>
                <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  {study.findings || "Scan acquired and pending official consultant radiologist interpretation."}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Diagnostic Impression:</span>
                <p className="text-slate-100 font-bold mt-1 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  {study.impression || "Awaiting finalized impression."}
                </p>
              </div>

              <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-400 space-y-1">
                <p>
                  <span className="text-slate-500">Reporting Radiologist:</span>{" "}
                  <span className="font-semibold text-slate-300">{study.radiologistName || "Staff Radiologist"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Radiographer / Tech:</span>{" "}
                  <span className="text-slate-300">{study.technicianName || "Radiographer"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Study Status:</span>{" "}
                  <span className="font-bold text-teal-400 uppercase">{study.status}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
