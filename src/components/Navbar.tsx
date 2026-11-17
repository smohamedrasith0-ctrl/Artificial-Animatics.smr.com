import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  onNavigateSection: (sectionId: string) => void;
  onGetStarted: () => void;
}

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'services', label: 'Services' },
  { id: 'portfolio', label: 'Our Work' },
  { id: 'about', label: 'About Us' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'contact', label: 'Contact' },
];

export const Navbar: React.FC<NavbarProps> = ({ onNavigateSection, onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (id: string) => {
    setMobileOpen(false);
    onNavigateSection(id);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'bg-[#05070d]/85 backdrop-blur-xl border-b border-white/10'
          : 'bg-gradient-to-b from-[#05070d]/80 to-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('home');
          }}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg py-1"
          aria-label="Artificial Animatics Home"
        >
          <BrandLogo size="sm" />
        </a>

        {/* Zone 2: Single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.id);
              }}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 relative py-1 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-[1.5px] after:bg-gradient-to-r after:from-cyan-400 after:to-purple-500 hover:after:w-full after:transition-all after:duration-200 focus-visible:outline-none focus-visible:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Glowing Primary CTA + Mobile drawer toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onGetStarted}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 transition-all duration-200 shadow-[0_0_24px_rgba(37,99,235,0.45)] hover:shadow-[0_0_32px_rgba(6,182,212,0.55)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Get Started
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#070b16]/98 backdrop-blur-xl border-b border-white/10 px-4 py-5 space-y-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.id);
              }}
              className="block px-3 py-3 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onGetStarted();
              }}
              className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
