import React from 'react';
import { Instagram, Lock, Mail, MessageCircle } from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateSection, onOpenAdmin }) => {
  const { brand, contact, services, isAdmin } = useStudioData();
  const activeServices = services.filter((s) => s.active).slice(0, 8);
  const cleanWhatsapp = contact.whatsappNumber.replace(/[^\d]/g, '');

  return (
    <footer className="relative bg-[#03050c]/75 backdrop-blur-md border-t border-white/10 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <BrandLogo size="sm" />
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {brand.tagline}
            </p>
            <div className="flex items-center gap-3 pt-2">
              {cleanWhatsapp.length >= 7 ? (
                <a
                  href={`https://wa.me/${cleanWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:border-emerald-400/40 text-slate-300 hover:text-emerald-400 flex items-center justify-center transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateSection('contact')}
                  aria-label="WhatsApp Contact"
                  className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:border-emerald-400/40 text-slate-300 hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}

              {contact.instagramUrl ? (
                <a
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:border-purple-400/40 text-slate-300 hover:text-purple-400 flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateSection('contact')}
                  aria-label="Instagram Contact"
                  className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:border-purple-400/40 text-slate-300 hover:text-purple-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Instagram className="w-4 h-4" />
                </button>
              )}

              {contact.contactEmail ? (
                <a
                  href={`mailto:${contact.contactEmail}`}
                  aria-label="Email Studio"
                  className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:border-cyan-400/40 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateSection('contact')}
                  aria-label="Email Contact"
                  className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:border-cyan-400/40 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="lg:col-span-3">
            <h3 className="font-display text-sm font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {[
                { id: 'home', label: 'Home' },
                { id: 'services', label: 'Services' },
                { id: 'portfolio', label: 'Our Work' },
                { id: 'about', label: 'About Us' },
                { id: 'pricing', label: 'Pricing' },
                { id: 'contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateSection(link.id);
                    }}
                    className="hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="lg:col-span-5">
            <h3 className="font-display text-sm font-semibold text-white mb-4">Services</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-400">
              {activeServices.map((srv) => (
                <li key={srv.id}>
                  <a
                    href="#services"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateSection('services');
                    }}
                    className="hover:text-cyan-400 transition-colors block truncate"
                  >
                    {srv.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Admin Login Gate */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {brand.companyName || 'Artificial Animatics'}. All rights
            reserved.
          </p>

          <button
            type="button"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isAdmin
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-cyan-300 hover:border-cyan-400/35'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Admin Control Portal' : 'Admin Login'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
