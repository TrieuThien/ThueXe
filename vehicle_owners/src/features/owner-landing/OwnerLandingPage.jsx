import { useMemo, useState } from 'react';
import LandingHeader from './components/LandingHeader';
import HeroSection from './components/HeroSection';
import BenefitsSection from './components/BenefitsSection';
import StepsSection from './components/StepsSection';
import FeaturesSection from './components/FeaturesSection';
import CTASection from './components/CTASection';
import LandingFooter from './components/LandingFooter';
import { ownerLandingI18n } from './data/ownerLandingI18n';

export default function OwnerLandingPage() {
  const [language, setLanguage] = useState('vi');
  const t = useMemo(() => ownerLandingI18n[language], [language]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-0 h-96 w-96 rounded-full bg-blue-200/45 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-1/3 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl" />

      <LandingHeader t={t} language={language} onLanguageChange={setLanguage} />
      <HeroSection t={t} />
      <BenefitsSection t={t} />
      <StepsSection t={t} />
      <FeaturesSection t={t} />
      <CTASection t={t} />
      <LandingFooter t={t} />
    </div>
  );
}
