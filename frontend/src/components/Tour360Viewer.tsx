import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, RotateCw, Info } from "lucide-react";

interface Tour360ViewerProps {
  imageUrl: string;
  roomName: string;
  onClose: () => void;
}

/**
 * Panoramic 360° viewer.
 *
 * Technique: the panorama image is placed at 300% width.
 * We track a continuous offsetX (degrees 0–360) and map it to
 * a pixel translateX so it wraps infinitely — no hard edges.
 * RotateX (pitch) is clamped to ±40° so you can't flip upside-down.
 * Zoom is applied with CSS scale (0.5× – 3×).
 * Scroll wheel zooms. Mouse drag and touch drag both rotate.
 */
const Tour360Viewer = ({ imageUrl, roomName, onClose }: Tour360ViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);

  // Continuous yaw (degrees) — wraps modulo 360 so image scrolls infinitely
  const yawRef   = useRef(0);   // mutable ref so drag handler is stable
  const pitchRef = useRef(0);
  const [yaw,   setYaw]   = useState(0);
  const [pitch, setPitch] = useState(0);
  const [zoom,  setZoom]  = useState(1);

  const dragging  = useRef(false);
  const lastPos   = useRef({ x: 0, y: 0 });

  const [loaded,      setLoaded]      = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint,    setShowHint]    = useState(true);

  // Hide the drag-hint after 3 s once image is loaded
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(t);
  }, [loaded]);

  // Auto-rotate slowly until the user starts dragging
  const autoRotateRef = useRef<number | null>(null);
  const userInteracted = useRef(false);

  useEffect(() => {
    const tick = () => {
      if (!userInteracted.current) {
        yawRef.current = (yawRef.current + 0.08) % 360;
        setYaw(yawRef.current);
      }
      autoRotateRef.current = requestAnimationFrame(tick);
    };
    autoRotateRef.current = requestAnimationFrame(tick);
    return () => { if (autoRotateRef.current) cancelAnimationFrame(autoRotateRef.current); };
  }, []);

  // Keyboard: Escape closes, arrow keys pan
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      userInteracted.current = true;
      if (e.key === "ArrowLeft")  { yawRef.current   -= 3; setYaw(y => y - 3); }
      if (e.key === "ArrowRight") { yawRef.current   += 3; setYaw(y => y + 3); }
      if (e.key === "ArrowUp")    { pitchRef.current  = Math.max(-40, pitchRef.current - 3); setPitch(pitchRef.current); }
      if (e.key === "ArrowDown")  { pitchRef.current  = Math.min(40,  pitchRef.current + 3); setPitch(pitchRef.current); }
      if (e.key === "+" || e.key === "=") setZoom(z => Math.min(3, z + 0.1));
      if (e.key === "-")                  setZoom(z => Math.max(0.5, z - 0.1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Mouse drag ───────────────────────────────────────────
  const startDrag = (x: number, y: number) => {
    dragging.current = true;
    userInteracted.current = true;
    lastPos.current = { x, y };
  };

  const moveDrag = useCallback((x: number, y: number) => {
    if (!dragging.current) return;
    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    yawRef.current   = (yawRef.current + dx * 0.25);
    pitchRef.current = Math.max(-40, Math.min(40, pitchRef.current - dy * 0.25));
    setYaw(yawRef.current);
    setPitch(pitchRef.current);
    lastPos.current = { x, y };
  }, []);

  const endDrag = () => { dragging.current = false; };

  // ── Scroll to zoom ───────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    userInteracted.current = true;
    setZoom(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.001)));
  };

  // ── Fullscreen ───────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Image transform math ─────────────────────────────────
  // Image is 300% wide. At yaw=0 we center it (translateX = -33.33%).
  // Each full 360° yaw scrolls through 100% of the image width → 100/360 = 0.2778% per degree.
  // We negate yaw so dragging right moves left (natural feel).
  const imgWidthPct = 300;
  const centerOffset = -(imgWidthPct - 100) / 2; // -100% when imgWidthPct=300
  const xOffsetPct   = centerOffset - (yaw % 360) * (imgWidthPct / 360);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${roomName} 360° Tour`}
    >
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/10 grid place-items-center">
            <RotateCw className="w-3.5 h-3.5 text-white/70" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{roomName}</p>
            <p className="text-white/40 text-[11px]">360° Panorama Tour</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom out */}
          <button
            onClick={() => setZoom(z => Math.max(0.5, +(z - 0.2).toFixed(1)))}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom Out (−)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom level display */}
          <span className="text-white/60 text-xs w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          {/* Zoom in */}
          <button
            onClick={() => setZoom(z => Math.min(3, +(z + 0.2).toFixed(1)))}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Reset view */}
          <button
            onClick={() => { yawRef.current = 0; pitchRef.current = 0; setYaw(0); setPitch(0); setZoom(1); }}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Reset View"
            aria-label="Reset View"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition-colors ml-1"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Panorama canvas ──────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ cursor: dragging.current ? "grabbing" : "grab" }}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={(e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchMove={(e)  => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={endDrag}
        onWheel={onWheel}
      >
        {/* Loading spinner */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            <p className="text-white/50 text-sm">Loading 360° tour…</p>
          </div>
        )}

        {/* Panorama image */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt={`${roomName} 360° panorama`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          draggable={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${imgWidthPct}%`,
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            transform: `translateX(${xOffsetPct}%) rotateX(${pitch}deg) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragging.current ? "none" : "transform 0.05s linear",
            opacity: loaded ? 1 : 0,
            userSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "none",
          }}
        />

        {/* Drag hint */}
        {loaded && showHint && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white/80 text-xs px-4 py-2 rounded-full pointer-events-none animate-pulse">
            <RotateCw className="w-3.5 h-3.5" />
            Drag to explore · Scroll to zoom · Arrow keys to navigate
          </div>
        )}

        {/* Controls hint (always visible, bottom-right) */}
        {loaded && !showHint && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/40 text-white/50 text-[10px] px-2.5 py-1.5 rounded-lg pointer-events-none">
            <Info className="w-3 h-3" />
            Drag · Scroll · Arrows
          </div>
        )}
      </div>
    </div>
  );
};

export default Tour360Viewer;
