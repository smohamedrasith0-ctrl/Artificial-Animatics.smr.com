import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useStudioData } from '../context/StudioDataContext';

interface PricingSectionProps {
  onSelectTier: (tierName: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectTier }) => {
  const { pricingTiers } = useStudioData();

  return (
    <section id="pricing" className="relative py-24 sm:py-28 bg-[#030610]/30 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-medium tracking-widest uppercase text-purple-400 mb-3">
            Pricing
          </p>
          <h2
            className="font-display font-bold text-white tracking-tight leading-tight mb-4"
            style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
          >
            Flexible Production Tiers Built Around Your Campaign
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Every project is scoped to your deliverables, runtime, and visual complexity. Reach out
            for a tailored production quote.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {pricingTiers.map((tier, idx) => (
            <motion.article
              key={tier.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={`relative flex flex-col justify-between rounded-2xl p-8 transition-all duration-200 ${
                tier.highlighted
                  ? 'border border-cyan-400/50 bg-gradient-to-b from-[#0f172a]/90 to-[#090d18]/90 backdrop-blur-md shadow-[0_0_40px_-12px_rgba(6,182,212,0.3)]'
                  : 'border border-white/10 bg-[#0b101d]/75 backdrop-blur-md hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="font-display text-xl font-bold text-white">{tier.name}</h3>
                  {tier.highlighted && (
                    <span className="text-xs font-medium text-cyan-400">Most Popular</span>
                  )}
                </div>

                <p className="font-display text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                  {tier.priceLabel || 'Contact for Pricing'}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed mb-7">{tier.summary}</p>

                <ul className="space-y-3.5 mb-8 pt-6 border-t border-white/10">
                  {tier.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onSelectTier(tier.name)}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  tier.highlighted
                    ? 'text-white bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 shadow-[0_0_24px_rgba(37,99,235,0.4)]'
                    : 'text-white border border-white/15 bg-white/[0.04] hover:bg-white/[0.09] hover:border-cyan-400/40'
                }`}
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
