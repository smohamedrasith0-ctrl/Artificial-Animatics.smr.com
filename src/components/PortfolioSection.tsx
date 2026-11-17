import React, { useMemo, useState } from 'react';
import { Film, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { useStudioData } from '../context/StudioDataContext';
import { PORTFOLIO_CATEGORIES, PortfolioCategory, PortfolioItem } from '../types';
import { VideoPreviewModal } from './VideoPreviewModal';

interface PortfolioSectionProps {
  onCommissionSimilar: (item: PortfolioItem) => void;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({ onCommissionSimilar }) => {
  const { portfolio } = useStudioData();
  const [activeCategory, setActiveCategory] = useState<'All' | PortfolioCategory>('All');
  const [previewItem, setPreviewItem] = useState<PortfolioItem | null>(null);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return portfolio;
    return portfolio.filter((item) => item.category === activeCategory);
  }, [portfolio, activeCategory]);

  return (
    <section
      id="portfolio"
      className="relative py-24 sm:py-28 bg-[#030610]/30 border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-purple-400 mb-3">
              Our Work
            </p>
            <h2
              className="font-display font-bold text-white tracking-tight leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
            >
              Selected AI Productions & Visual Reels
            </h2>
          </div>

          {/* Interactive Category Filters */}
          <div
            className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-white/10 bg-[#0b101d]"
            role="tablist"
            aria-label="Filter portfolio by category"
          >
            {(['All', ...PORTFOLIO_CATEGORIES] as const).map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Responsive Portfolio Gallery */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0b101d] p-12 text-center">
            <Film className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-300">
              {portfolio.length === 0
                ? 'Portfolio showreels are currently being updated. Contact our studio to request private client reels.'
                : `No productions found in ${activeCategory}. Select All to view available projects.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, idx) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(idx * 0.05, 0.25),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group rounded-2xl border border-white/10 bg-[#0b101d]/90 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-purple-400/45 hover:shadow-[0_14px_40px_-14px_rgba(139,92,246,0.3)]"
              >
                {/* 16:9 Thumbnail + Play Overlay */}
                <button
                  type="button"
                  onClick={() => setPreviewItem(item)}
                  className="relative block w-full aspect-video overflow-hidden bg-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label={`Play preview of ${item.title}`}
                >
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#05070d]/85 via-black/20 to-transparent"
                    aria-hidden="true"
                  />

                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-14 h-14 rounded-full border border-white/25 bg-[#05070d]/70 backdrop-blur-md text-white flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:border-cyan-400 group-hover:bg-blue-600/80 shadow-[0_0_25px_rgba(0,0,0,0.6)]">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </span>
                  </span>

                  <span className="absolute bottom-3 right-3 text-xs font-mono tabular-nums text-slate-200 bg-black/70 px-2 py-0.5 rounded">
                    {item.duration}
                  </span>
                </button>

                {/* Unboxed Metadata & Description */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="text-cyan-400 font-medium">{item.category}</span>
                    {item.clientName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{item.clientName}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white mb-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      <VideoPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onCommissionSimilar={onCommissionSimilar}
      />
    </section>
  );
};
