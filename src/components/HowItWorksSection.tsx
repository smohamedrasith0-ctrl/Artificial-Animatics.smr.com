import React from 'react';
import { CheckCircle2, Cpu, Lightbulb, MessageSquareText } from 'lucide-react';
import { motion } from 'motion/react';

const STEPS = [
  {
    step: 'Step 1',
    title: 'Share Your Idea',
    description:
      'Tell us about your brand, target audience, product goals, and preferred platforms in a short project brief.',
    icon: MessageSquareText,
    glow: 'from-cyan-500/25 to-blue-600/25 text-cyan-300 border-cyan-400/30',
  },
  {
    step: 'Step 2',
    title: 'We Create the Concept',
    description:
      'Our creative team develops the script, visual moodboards, pacing structure, and art direction for your approval.',
    icon: Lightbulb,
    glow: 'from-blue-600/25 to-purple-600/25 text-blue-300 border-blue-400/30',
  },
  {
    step: 'Step 3',
    title: 'AI Video Production',
    description:
      'We craft generative cinematography, 3D motion graphics, voiceover, and sound design with frame-by-frame polish.',
    icon: Cpu,
    glow: 'from-purple-600/25 to-orange-500/25 text-purple-300 border-purple-400/30',
  },
  {
    step: 'Step 4',
    title: 'Final Video Delivery',
    description:
      'Receive ready-to-publish masters formatted for widescreen, social reels, and paid ad placements.',
    icon: CheckCircle2,
    glow: 'from-orange-500/25 to-cyan-500/25 text-orange-300 border-orange-400/30',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="relative py-24 sm:py-28 bg-[#030610]/30 border-t border-white/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-medium tracking-widest uppercase text-cyan-400 mb-3">
            How It Works
          </p>
          <h2
            className="font-display font-bold text-white tracking-tight leading-tight mb-4"
            style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
          >
            From Initial Spark to Campaign-Ready Film
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            A streamlined four-step workflow built for clarity, creative alignment, and rapid
            delivery.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Connecting Gradient Line (Desktop) */}
          <div
            className="hidden lg:block absolute top-11 left-[12%] right-[12%] h-px bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-orange-500/40 pointer-events-none"
            aria-hidden="true"
          />

          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl border border-white/10 bg-[#0b101d]/85 backdrop-blur-md p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br border flex items-center justify-center ${item.glow}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">{item.step}</span>
                </div>

                <h3 className="font-display text-lg font-semibold text-white mb-2.5">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
