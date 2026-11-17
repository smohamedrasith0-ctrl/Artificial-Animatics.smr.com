import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Pause, Play, X } from 'lucide-react';
import { isFirestoreVideoUrl, loadFirestoreVideoObjectUrl } from '../lib/videoStorage';
import { PortfolioItem } from '../types';

interface VideoPreviewModalProps {
  item: PortfolioItem | null;
  onClose: () => void;
  onCommissionSimilar: (item: PortfolioItem) => void;
}

function getEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  return null;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  item,
  onClose,
  onCommissionSimilar,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [resolvedGalleryUrl, setResolvedGalleryUrl] = useState<string | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (item) {
      window.addEventListener('keydown', onKeyDown);
      setIsPlaying(true);
      setProgress(0);
    }
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  // Load gallery video uploaded to Firestore chunks when using firestore-video://
  useEffect(() => {
    setResolvedGalleryUrl(null);
    setGalleryError('');
    if (!item || !isFirestoreVideoUrl(item.videoUrl)) {
      setGalleryLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setGalleryLoading(true);

    loadFirestoreVideoObjectUrl(item.videoUrl)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setResolvedGalleryUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setGalleryError(
            err instanceof Error ? err.message : 'Unable to load uploaded gallery video.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setGalleryLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item]);

  // Procedural motion showreel preview when item uses placeholder (no external videoUrl yet)
  useEffect(() => {
    if (!item || item.videoUrl.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = item.thumbnailUrl;

    let start = performance.now();
    let elapsedAtPause = 0;

    const draw = (now: number) => {
      const w = (canvas.width = 960);
      const h = (canvas.height = 540);
      const t = isPlaying ? (now - start) / 1000 : elapsedAtPause;
      const loopDur = 12;
      const loopT = (t % loopDur) / loopDur;
      if (isPlaying) {
        setProgress(Math.round(loopT * 100));
      }

      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);

      if (img.complete && img.naturalWidth > 0) {
        // Cinematic slow Ken Burns push & drift
        const scale = 1.04 + Math.sin(loopT * Math.PI) * 0.08;
        const panX = Math.sin(loopT * Math.PI * 2) * 14;
        const panY = Math.cos(loopT * Math.PI * 2) * 8;
        const drawW = w * scale;
        const drawH = h * scale;
        ctx.drawImage(img, (w - drawW) / 2 + panX, (h - drawH) / 2 + panY, drawW, drawH);
      }

      // Subtle volumetric light sweep across frame
      const sweepX = loopT * (w + 420) - 210;
      const grad = ctx.createLinearGradient(sweepX - 160, 0, sweepX + 160, h);
      grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
      grad.addColorStop(0.45, 'rgba(6, 182, 212, 0.14)');
      grad.addColorStop(0.55, 'rgba(139, 92, 246, 0.14)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle widescreen letterbox bars
      ctx.fillStyle = 'rgba(5, 7, 13, 0.85)';
      ctx.fillRect(0, 0, w, 28);
      ctx.fillRect(0, h - 28, w, 28);

      if (isPlaying) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        elapsedAtPause = t;
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [item, isPlaying]);

  if (!item) return null;

  const isGalleryVideo = isFirestoreVideoUrl(item.videoUrl);
  const embedUrl = isGalleryVideo ? null : getEmbedUrl(item.videoUrl);
  const hasDirectVideo = Boolean(item.videoUrl.trim()) && !embedUrl && !isGalleryVideo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Video preview: ${item.title}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-white/15 bg-[#090d18] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span className="text-cyan-400 font-medium">{item.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{item.duration}</span>
              {item.clientName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{item.clientName}</span>
                </>
              )}
            </div>
            <h3 className="font-display text-base sm:text-lg font-semibold text-white truncate">
              {item.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Close video preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Stage */}
        <div className="relative aspect-video bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={item.title}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : isGalleryVideo ? (
            galleryLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 bg-[#05070d]">
                <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-400">Loading studio video...</p>
              </div>
            ) : galleryError ? (
              <div className="w-full h-full flex items-center justify-center px-6 text-center bg-[#05070d]">
                <p className="text-sm text-rose-300">{galleryError}</p>
              </div>
            ) : resolvedGalleryUrl ? (
              <video
                src={resolvedGalleryUrl}
                poster={item.thumbnailUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : null
          ) : hasDirectVideo ? (
            <video
              src={item.videoUrl}
              poster={item.thumbnailUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="relative w-full h-full">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
              {/* Placeholder Reel Controls */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 py-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer shrink-0"
                  aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-300 shrink-0">
                  Sample Motion Preview
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Caption & Action */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b101d]">
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">{item.description}</p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onCommissionSimilar(item);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Commission Similar Video</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
