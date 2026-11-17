/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { AboutSection } from './components/AboutSection';
import { AdminDashboard } from './components/AdminDashboard';
import { ContactSection } from './components/ContactSection';
import { CosmicUniverseBackground } from './components/CosmicUniverseBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { Navbar } from './components/Navbar';
import { PortfolioSection } from './components/PortfolioSection';
import { PricingSection } from './components/PricingSection';
import { ServicesSection } from './components/ServicesSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { WhyChooseUsSection } from './components/WhyChooseUsSection';
import { StudioDataProvider } from './context/StudioDataContext';
import { PortfolioItem } from './types';

function AgencyShell() {
  const [adminView, setAdminView] = useState<boolean>(() => window.location.hash === '#admin');
  const [preselectedService, setPreselectedService] = useState<string>('');

  useEffect(() => {
    const scrubAdminHash = () => {
      if (window.location.hash === '#admin') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    scrubAdminHash();

    const onHashChange = () => {
      if (window.location.hash === '#admin') {
        setAdminView(true);
        scrubAdminHash();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminView(true);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleOpenAdmin = () => {
    setAdminView(true);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleExitAdmin = () => {
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setAdminView(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleSelectServiceAndContact = (serviceTitle: string) => {
    setPreselectedService(serviceTitle);
    scrollToSection('contact');
  };

  const handleSelectPricingAndContact = (tierName: string) => {
    setPreselectedService(`${tierName} Package`);
    scrollToSection('contact');
  };

  const handleCommissionSimilar = (item: PortfolioItem) => {
    const categoryToService: Record<string, string> = {
      Advertisements: 'AI Advertisement Videos',
      'Real Estate': 'Real Estate Promotional Videos',
      'Product Videos': 'Product Promotional Videos',
      'Business Promotions': 'Business Promotional Videos',
      'Creative Animations': '3D Animation and Motion Graphics',
    };
    setPreselectedService(categoryToService[item.category] || 'Custom AI Video Production');
    scrollToSection('contact');
  };

  if (adminView) {
    return (
      <div className="relative z-10">
        <AdminDashboard onExitAdmin={handleExitAdmin} />
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen text-slate-100 flex flex-col">
      <Navbar
        onNavigateSection={scrollToSection}
        onGetStarted={() => scrollToSection('contact')}
      />

      <main className="flex-1">
        <HeroSection
          onExploreServices={() => scrollToSection('services')}
          onGetVideoMade={() => scrollToSection('contact')}
        />
        <ServicesSection onSelectService={handleSelectServiceAndContact} />
        <PortfolioSection onCommissionSimilar={handleCommissionSimilar} />
        <WhyChooseUsSection />
        <HowItWorksSection />
        <AboutSection onStartProject={() => scrollToSection('contact')} />
        <PricingSection onSelectTier={handleSelectPricingAndContact} />
        <TestimonialsSection />
        <ContactSection preselectedService={preselectedService} />
      </main>

      <Footer onNavigateSection={scrollToSection} onOpenAdmin={handleOpenAdmin} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudioDataProvider>
        <div className="relative min-h-screen bg-[#03050d]">
          <CosmicUniverseBackground />
          <AgencyShell />
        </div>
      </StudioDataProvider>
    </ErrorBoundary>
  );
}
