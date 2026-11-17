import React from 'react';
import { motion } from 'motion/react';
import { ABOUT_STUDIO_IMAGE } from '../data/defaults';
import { useStudioData } from '../context/StudioDataContext';

interface AboutSectionProps {
  onStartProject: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onStartProject }) => {
  const { brand } = useStudioData();

  return (
    <section id="about" className="relative py-24 sm:py-28 bg-[#050814]/45 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0b101d]/75 backdrop-blur-md p-8 sm:p-10"
          >
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-blue-400 mb-3">
                About Us
              </p>
              <h2
                className="font-display font-bold text-white tracking-tight leading-[1.1] mb-6"
                style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.65rem)', textWrap: 'balance' }}
              >
                {brand.aboutHeadline}
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
                {brand.aboutDescription}
              </p>
            </div>

            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                <span className="text-slate-200 font-medium">AI Cinema</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span className="text-slate-200 font-medium">3D Motion</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span className="text-slate-200 font-medium">Brand Storytelling</span>
              </div>
              <button
                type="button"
                onClick={onStartProject}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Partner With Us
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative rounded-2xl border border-white/10 overflow-hidden min-h-[320px]"
          >
            <img
              src={ABOUT_STUDIO_IMAGE}
              alt="Artificial Animatics post-production and color grading suite"
              referrerPolicy="no-referrer"
              className="w-full h-full lg:h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#05070d]/85 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-5 left-6 right-6">
              <p className="text-xs font-mono text-cyan-400 mb-1">POST-PRODUCTION & DIRECTION</p>
              <p className="text-sm font-medium text-white">
                Human creative oversight paired with next-generation generative workflows.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
