import React from 'react';
import { motion } from 'motion/react';

const ADVANTAGES = [
  {
    num: '01',
    title: 'AI-powered creativity.',
    detail:
      'Cutting-edge generative video pipelines unlocked for visual concepts that traditional shoots cannot easily stage.',
    accent: 'text-cyan-400',
  },
  {
    num: '02',
    title: 'Unique visual storytelling.',
    detail:
      'Every frame is structured around brand positioning, audience psychology, and emotional narrative momentum.',
    accent: 'text-blue-400',
  },
  {
    num: '03',
    title: 'Professional video production.',
    detail:
      'Calibrated color grading, crisp typography, custom sound design, and cinema-grade pacing from start to export.',
    accent: 'text-purple-400',
  },
  {
    num: '04',
    title: 'Cost-effective advertising solutions.',
    detail:
      'Achieve studio-caliber commercial presence without heavy location logistics, travel, or bloated crew overheads.',
    accent: 'text-orange-400',
  },
  {
    num: '05',
    title: 'Customised creative concepts.',
    detail:
      'No recycled templates—every script, visual aesthetic, and aspect ratio is built specifically for your product and market.',
    accent: 'text-cyan-400',
  },
  {
    num: '06',
    title: 'Faster content production.',
    detail:
      'Accelerated concept-to-delivery cycles so your campaigns launch while market attention and seasonal windows are peak.',
    accent: 'text-purple-400',
  },
];

export const WhyChooseUsSection: React.FC = () => {
  return (
    <section className="relative py-24 sm:py-28 bg-[#050814]/45 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <p className="text-xs font-medium tracking-widest uppercase text-orange-400 mb-3">
              Why Choose Us
            </p>
            <h2
              className="font-display font-bold text-white tracking-tight leading-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.65rem)', textWrap: 'balance' }}
            >
              Built for Creative Velocity and Commercial Clarity
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              We bridge artificial intelligence engineering with seasoned advertising craft so your
              brand commands attention across every screen.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ADVANTAGES.map((adv, idx) => (
              <motion.div
                key={adv.num}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-white/10 bg-[#0b101d]/75 backdrop-blur-md p-6 hover:border-white/20 transition-colors"
              >
                <span className={`block text-xs font-mono tabular-nums mb-3 ${adv.accent}`}>
                  {adv.num}.
                </span>
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  {adv.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{adv.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
