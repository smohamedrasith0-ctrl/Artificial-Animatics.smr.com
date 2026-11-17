import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { HERO_BACKDROP_IMAGE } from '../data/defaults';
import { BrandLogo } from './BrandLogo';

interface HeroSectionProps {
  onExploreServices: () => void;
  onGetVideoMade: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreServices,
  onGetVideoMade,
}) => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16"
    >
      {/* Subtle Atmospheric Cinema Stage Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={HERO_BACKDROP_IMAGE}
          alt="Artificial Animatics dark cinema production stage"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-20 scale-[1.02]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#03050d]/55 via-[#03050d]/35 to-[#03050d]/70"
          aria-hidden="true"
        />
      </div>

      {/* Subtle Ambient Blue, Purple & Orange Volumetric Highlights */}
      <div
        className="absolute -top-24 -left-24 w-[540px] h-[540px] rounded-full bg-blue-600/15 blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 -right-24 w-[520px] h-[520px] rounded-full bg-purple-600/15 blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] rounded-full bg-orange-500/10 blur-[130px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Hero Foreground Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
              <BrandLogo size="lg" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-bold tracking-tight text-white leading-[1.06] mb-6"
            style={{
              fontSize: 'clamp(2.25rem, 4.8vw, 4.25rem)',
              textWrap: 'balance',
            }}
          >
            WE TURN IMAGINATION INTO{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              VISUAL REALITY.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10"
          >
            Next-generation AI video production and creative advertising solutions that bring
            brands, products and ideas to life.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={onGetVideoMade}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 transition-all duration-200 shadow-[0_0_30px_rgba(37,99,235,0.45)] hover:shadow-[0_0_40px_rgba(139,92,246,0.55)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span>Get Your Video Made</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onExploreServices}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-slate-100 border border-white/15 bg-white/[0.04] hover:bg-white/[0.09] hover:border-cyan-400/50 backdrop-blur-md transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Play className="w-4 h-4 text-cyan-400" />
              <span>Explore Our Services</span>
            </button>
          </motion.div>
        </div>

        {/* Clean Horizontal Capability Strip below Hero Focal Anchor */}
        <div className="mt-16 pt-8 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
          <div>
            <p className="text-xs font-mono text-cyan-400 mb-1">01 · COMMERCIALS</p>
            <p className="text-sm font-medium text-slate-200">AI Advertisement Films</p>
          </div>
          <div>
            <p className="text-xs font-mono text-blue-400 mb-1">02 · PRODUCT</p>
            <p className="text-sm font-medium text-slate-200">3D & Studio Product Reveals</p>
          </div>
          <div>
            <p className="text-xs font-mono text-purple-400 mb-1">03 · ARCHITECTURE</p>
            <p className="text-sm font-medium text-slate-200">Real Estate Visual Tours</p>
          </div>
          <div>
            <p className="text-xs font-mono text-orange-400 mb-1">04 · SOCIAL</p>
            <p className="text-sm font-medium text-slate-200">High-Retention Reels & Shorts</p>
          </div>
        </div>
      </div>
    </section>
  );
};
