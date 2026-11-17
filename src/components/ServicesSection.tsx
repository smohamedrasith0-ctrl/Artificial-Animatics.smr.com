import React from 'react';
import {
  ArrowUpRight,
  Box,
  Briefcase,
  Building2,
  Clapperboard,
  Film,
  Layers,
  Smartphone,
  Wand2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStudioData } from '../context/StudioDataContext';

interface ServicesSectionProps {
  onSelectService: (serviceTitle: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clapperboard,
  Box,
  Building2,
  Film,
  Layers,
  Smartphone,
  Briefcase,
  Wand2,
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  const { services } = useStudioData();
  const activeServices = services.filter((s) => s.active);

  return (
    <section
      id="services"
      className="relative py-24 sm:py-28 bg-[#050814]/45 border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-widest uppercase text-cyan-400 mb-3">
              Our Services
            </p>
            <h2
              className="font-display font-bold text-white tracking-tight leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
            >
              AI Video Production Engineered for Modern Brands
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-400 max-w-md leading-relaxed">
            Every production blends generative visual precision with human creative direction to
            deliver cinema-grade campaigns at speed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {activeServices.map((service, index) => {
            const IconComponent = ICON_MAP[service.iconName] || Clapperboard;
            const numLabel = String(index + 1).padStart(2, '0');

            return (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(index * 0.04, 0.25),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0b101d]/80 backdrop-blur-md p-6 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_12px_36px_-12px_rgba(6,182,212,0.25)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-orange-500/15 flex items-center justify-center text-cyan-300 group-hover:text-white group-hover:border-cyan-400/40 transition-colors">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-500 group-hover:text-cyan-400 transition-colors">
                      {numLabel}.
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-semibold text-white mb-2.5 leading-snug">
                    {service.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {service.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => onSelectService(service.title)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 group-hover:text-cyan-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
                  >
                    <span>Request This Service</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
