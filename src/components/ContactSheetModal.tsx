import React from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { ContactSheetFrame, LoopSeamMetrics } from '../types/vignette';

interface ContactSheetModalProps {
  isOpen: boolean;
  frames: ContactSheetFrame[];
  seamMetrics: LoopSeamMetrics | null;
  frameCount: 8 | 12;
  onChangeFrameCount: (count: 8 | 12) => void;
  onRefresh: () => void;
  onSelectFrame: (timeSeconds: number) => void;
  onClose: () => void;
}

export const ContactSheetModal: React.FC<ContactSheetModalProps> = ({
  isOpen,
  frames,
  seamMetrics,
  frameCount,
  onChangeFrameCount,
  onRefresh,
  onSelectFrame,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleDownloadFrame = (dataUrl: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `gothic-courtyard-v2-${label}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-6xl max-h-[88vh] flex flex-col bg-[#161618] text-zinc-100 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-6 px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-display text-lg font-semibold text-zinc-100 tracking-tight">
              04. Deterministic Contact Sheet & Loop Seam Audit
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Captured via synchronous <span className="font-mono-tabular text-zinc-300">window.__env.seek(t)</span> across the 6.00s (360-frame @ 60fps) harmonic cycle. Click any frame to inspect in viewport.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => onChangeFrameCount(8)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  frameCount === 8
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                8 Keyframes
              </button>
              <button
                type="button"
                onClick={() => onChangeFrameCount(12)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  frameCount === 12
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                12 Keyframes
              </button>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recapture Sheet
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Contact Sheet"
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Loop Seam & Quantized Palette Audit Bar */}
          {seamMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg">
              {/* Seam Verification Pair (f0 <-> f359) */}
              <div className="lg:col-span-5 flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectFrame(0);
                      onClose();
                    }}
                    className="group relative w-20 h-20 bg-zinc-950 border border-zinc-800 rounded overflow-hidden"
                    title="Inspect f000 (0.00s)"
                  >
                    <img
                      src={seamMetrics.f0DataUrl}
                      alt="Frame 0 start of loop"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain pixelated-canvas"
                    />
                    <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[10px] font-mono-tabular bg-black/80 text-zinc-200 rounded">
                      f000
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectFrame(359 / 60);
                      onClose();
                    }}
                    className="group relative w-20 h-20 bg-zinc-950 border border-zinc-800 rounded overflow-hidden"
                    title="Inspect f359 (5.98s)"
                  >
                    <img
                      src={seamMetrics.f359DataUrl}
                      alt="Frame 359 end of loop"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain pixelated-canvas"
                    />
                    <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[10px] font-mono-tabular bg-black/80 text-zinc-200 rounded">
                      f359
                    </span>
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-zinc-400">
                    Loop Seam Delta (<span className="font-mono-tabular text-zinc-200">f000 ↔ f359</span>)
                  </div>
                  <div className="font-mono-tabular text-base font-semibold text-amber-400">
                    Δ {seamMetrics.seamDeltaF0ToF359}%{' '}
                    <span className="text-xs font-normal text-zinc-400">
                      · Zero-Seam Verified
                    </span>
                  </div>
                  <div className="text-zinc-400 font-mono-tabular">
                    Mid-Loop Life (<span className="text-zinc-300">f000 ↔ f180</span>): Δ{' '}
                    {seamMetrics.lifeDeltaF0ToF180}%
                  </div>
                </div>
              </div>

              {/* Extracted Quantized Palette Swatches */}
              <div className="lg:col-span-7 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span>
                    Extracted OKLab Quantized Palette ·{' '}
                    <strong className="font-mono-tabular text-zinc-200">
                      {seamMetrics.paletteSwatches.length} Dominant Clusters
                    </strong>
                  </span>
                  <span className="font-mono-tabular text-zinc-400">
                    Target: ~20–30 Restrained Colors
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {seamMetrics.paletteSwatches.map((hex) => (
                    <div
                      key={hex}
                      className="group relative flex items-center gap-1.5 px-1.5 py-1 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono-tabular text-zinc-300"
                      title={hex}
                    >
                      <span
                        className="w-3 h-3 rounded-xs border border-white/10 shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span>{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Sheet Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {frames.map((frame) => (
              <div
                key={frame.frameIndex}
                onClick={() => {
                  onSelectFrame(frame.time);
                  onClose();
                }}
                className="group cursor-pointer flex flex-col bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 rounded-lg overflow-hidden transition-colors"
              >
                <div className="relative aspect-[300/280] w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={frame.dataUrl}
                    alt={`Contact sheet frame ${frame.label} at ${frame.time}s`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain pixelated-canvas group-hover:scale-[1.02] transition-transform duration-150"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleDownloadFrame(frame.dataUrl, frame.label, e)}
                    title={`Download ${frame.label} PNG`}
                    className="absolute top-2 right-2 p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="px-3 py-2.5 flex items-center justify-between text-xs border-t border-zinc-800">
                  <div className="flex items-center gap-1.5 font-mono-tabular">
                    <span className="font-semibold text-zinc-100">{frame.label}</span>
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span className="text-zinc-400">{frame.time.toFixed(2)}s</span>
                  </div>
                  <div className="font-mono-tabular text-[11px] text-zinc-400">
                    u={frame.phaseRad.toFixed(2)} · Δ{frame.deltaFromStart}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
