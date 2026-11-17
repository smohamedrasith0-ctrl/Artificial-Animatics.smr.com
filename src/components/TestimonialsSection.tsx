import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useStudioData } from '../context/StudioDataContext';

export const TestimonialsSection: React.FC = () => {
  const { testimonials } = useStudioData();

  return (
    <section className="relative py-24 sm:py-28 bg-[#050814]/45 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-cyan-400 mb-3">
              Client Testimonials
            </p>
            <h2
              className="font-display font-bold text-white tracking-tight leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
            >
              Trusted Perspectives & Client Feedback
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            Sample reviews are clearly labeled until live client endorsements are published via the
            Admin Dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item, idx) => {
            const initials = item.customerName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0b101d]/75 backdrop-blur-md p-7"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div
                      className="flex items-center gap-1 text-orange-400"
                      aria-label={`Rated ${item.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-4 h-4 ${
                            starIdx < item.rating ? 'fill-current' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {item.isSample && (
                      <span className="text-xs text-slate-500">Sample Review</span>
                    )}
                  </div>

                  <blockquote className="text-sm sm:text-base text-slate-200 leading-relaxed mb-7">
                    "{item.quote}"
                  </blockquote>
                </div>

                <div className="flex items-center gap-3.5 pt-5 border-t border-white/10">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.customerName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-white/15 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full border border-white/15 bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center text-xs font-semibold text-cyan-300 shrink-0">
                      {initials || 'AA'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.customerName}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.role} · {item.company}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
