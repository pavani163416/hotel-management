import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, RotateCw } from "lucide-react";

interface Tour360ViewerProps {
  imageUrl: string;
  roomName: string;
  onClose: () => void;
}

/**
 * CSS-based 360° panorama viewer using mouse/touch drag to rotate.
 * No external library required — works on mobile and desktop.
 */
const Tour360Viewer = ({ imageUrl, roomName, onClose }: Tour360ViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setRotateY((prev) => prev + dx * 0.3);
    setRotateX((prev) => Math.max(-30, Math.min(30, prev - dy * 0.3)));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const onMouseUp = () => setIsDragging(false);

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - lastPos.current.x;
    const dy = e.touches[0].clientY - lastPos.current.y;
    setRotateY((prev) => prev + dx * 0.3);
    setRotateX((prev) => Math.max(-30, Math.min(30, prev - dy * 0.3)));
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" role="dialog" aria-label="360° Room Tour">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-white/60" />
          <span className="text-white font-semibold text-sm">{roomName} — 360° Tour</span>
          <span className="text-white/40 text-xs">Drag to look around</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Fullscreen">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-destructive text-white transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panorama Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => setIsDragging(false)}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          src={imageUrl}
          alt={`${roomName} 360° tour`}
          onLoad={() => setLoaded(true)}
          draggable={false}
          style={{
            width: "200%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            transform: `
              translateX(calc(-25% + ${rotateY * 0.4}%))
              rotateX(${rotateX}deg)
              scale(${zoom})
            `,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
            userSelect: "none",
            opacity: loaded ? 1 : 0,
          }}
        />
        {/* Hint overlay */}
        {loaded && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white/70 text-xs px-3 py-1.5 rounded-full pointer-events-none">
            Drag to explore · Scroll to zoom
          </div>
        )}
      </div>
    </div>
  );
};

export default Tour360Viewer;
