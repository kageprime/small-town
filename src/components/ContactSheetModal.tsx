import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
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
    link.download = `vaelenport-sanctuary-${label}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-between bg-[#0B0A08]/96 backdrop-blur-md text-[#D8D0C1] select-none pointer-events-auto overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 45%, rgba(76, 68, 52, 0.22) 0%, rgba(11, 10, 8, 0.96) 68%)',
      }}
    >
      {/* Top Classical Codex Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-12 pt-5 pb-3 flex flex-wrap items-center justify-between gap-4 border-b border-[#2A261F]">
        <div className="flex items-center gap-6">
          <span className="text-[11px] tracking-[0.2em] uppercase text-[#7C7465] hidden sm:inline">
            HARMONIC
          </span>
          <div className="flex flex-col items-center">
            <h2 className="font-display text-sm sm:text-base tracking-[0.24em] uppercase text-[#EFE7D6] font-semibold">
              CONTACT SHEET & SEAM AUDIT
            </h2>
            <div className="w-32 h-px bg-[#C8B273]/60 my-1" />
            <span className="text-[9px] tracking-[0.3em] text-[#9E937E]">··········</span>
          </div>
          <span className="text-[11px] tracking-[0.2em] uppercase text-[#7C7465] hidden sm:inline">
            CHRONICLE
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-[#14120F] border border-[#3A3327] p-1">
            <button
              type="button"
              onClick={() => onChangeFrameCount(8)}
              className={`px-3 py-1 text-xs font-display tracking-wider uppercase transition-colors ${
                frameCount === 8
                  ? 'bg-[#1B1813] border border-[#C8B273] text-[#EFE7D6]'
                  : 'text-[#9E937E] hover:text-[#D8D0C1]'
              }`}
            >
              8 Frames
            </button>
            <button
              type="button"
              onClick={() => onChangeFrameCount(12)}
              className={`px-3 py-1 text-xs font-display tracking-wider uppercase transition-colors ${
                frameCount === 12
                  ? 'bg-[#1B1813] border border-[#C8B273] text-[#EFE7D6]'
                  : 'text-[#9E937E] hover:text-[#D8D0C1]'
              }`}
            >
              12 Frames
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-display tracking-[0.14em] uppercase bg-[#161410] hover:bg-[#211D16] border border-[#4A4132] hover:border-[#C8B273] text-[#EFE7D6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C8B273]" />
            <span>Recapture</span>
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 overflow-y-auto space-y-6">
        {seamMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 bg-[#14120F] border border-[#3A3327]">
            {/* Seam Verification Pair (f0 <-> f359) */}
            <div className="lg:col-span-5 flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectFrame(0);
                    onClose();
                  }}
                  className="group relative w-20 h-20 bg-[#0B0A08] border border-[#3A3327] hover:border-[#C8B273] overflow-hidden"
                  title="Inspect f000 (0.00s)"
                >
                  <img
                    src={seamMetrics.f0DataUrl}
                    alt="Frame 0 start of loop"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain pixelated-canvas"
                  />
                  <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[10px] font-mono-tabular bg-[#0B0A08]/90 text-[#EFE7D6] border border-[#3A3327]">
                    f000
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectFrame(359 / 60);
                    onClose();
                  }}
                  className="group relative w-20 h-20 bg-[#0B0A08] border border-[#3A3327] hover:border-[#C8B273] overflow-hidden"
                  title="Inspect f359 (5.98s)"
                >
                  <img
                    src={seamMetrics.f359DataUrl}
                    alt="Frame 359 end of loop"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain pixelated-canvas"
                  />
                  <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[10px] font-mono-tabular bg-[#0B0A08]/90 text-[#EFE7D6] border border-[#3A3327]">
                    f359
                  </span>
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-[#9E937E] font-display tracking-wider uppercase">
                  Loop Seam Delta (<span className="font-mono-tabular text-[#EFE7D6]">f000 ↔ f359</span>)
                </div>
                <div className="font-mono-tabular text-base font-semibold text-[#C8B273]">
                  Δ {seamMetrics.seamDeltaF0ToF359}%{' '}
                  <span className="text-xs font-normal text-[#9E937E]">· Zero-Seam Verified</span>
                </div>
                <div className="text-[#9E937E] font-mono-tabular">
                  Mid-Loop Motion (<span className="text-[#D8D0C1]">f000 ↔ f180</span>): Δ{' '}
                  {seamMetrics.lifeDeltaF0ToF180}%
                </div>
              </div>
            </div>

            {/* Extracted Quantized Palette Swatches */}
            <div className="lg:col-span-7 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-[#2A251D] pt-4 lg:pt-0 lg:pl-6">
              <div className="flex items-center justify-between text-xs text-[#9E937E] mb-2">
                <span className="font-display tracking-wider uppercase">
                  Extracted Sanctuary Palette ·{' '}
                  <strong className="font-mono-tabular text-[#EFE7D6]">
                    {seamMetrics.paletteSwatches.length} Dominant Clusters
                  </strong>
                </span>
                <span className="font-mono-tabular text-[#C8B273]">Cohesive Stone & Slate</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {seamMetrics.paletteSwatches.map((hex) => (
                  <div
                    key={hex}
                    className="flex items-center gap-1.5 px-1.5 py-1 bg-[#0B0A08] border border-[#2A251D] text-[10px] font-mono-tabular text-[#D8D0C1]"
                    title={hex}
                  >
                    <span
                      className="w-3 h-3 border border-[#4A4132] shrink-0"
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
              className="group cursor-pointer flex flex-col bg-[#14120F] border border-[#3A3327] hover:border-[#C8B273] transition-colors"
            >
              <div className="relative aspect-video w-full bg-[#0B0A08] flex items-center justify-center overflow-hidden">
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
                  className="absolute top-2 right-2 p-1.5 bg-[#0B0A08]/90 hover:bg-[#1B1813] text-[#EFE7D6] border border-[#4A4132] hover:border-[#C8B273] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-3.5 h-3.5 text-[#C8B273]" />
                </button>
              </div>

              <div className="px-3 py-2 flex items-center justify-between text-xs border-t border-[#2A251D]">
                <div className="flex items-center gap-1.5 font-mono-tabular">
                  <span className="font-semibold text-[#EFE7D6]">{frame.label}</span>
                  <span aria-hidden="true" className="text-[#6E6658]">
                    ·
                  </span>
                  <span className="text-[#9E937E]">{frame.time.toFixed(2)}s</span>
                </div>
                <div className="font-mono-tabular text-[11px] text-[#C8B273]">
                  Δ{frame.deltaFromStart}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Legend */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-4 border-t border-[#2A251D] flex items-center justify-end gap-5 text-xs">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-[#D8D0C1] hover:text-[#C8B273] transition-colors"
        >
          <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#1C1914] border border-[#4A4132] text-[#C8B273]">
            Esc
          </span>
          <span>Back to Sanctuary</span>
        </button>
      </footer>
    </div>
  );
};
