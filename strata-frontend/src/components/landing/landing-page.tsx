import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { DailyLifeSection } from '@/components/landing/daily-life-section';
import { ManagementSection } from '@/components/landing/management-section';
import { PropertyFeaturesSection } from '@/components/landing/property-features-section';
import { OnboardingSection } from '@/components/landing/onboarding-section';
import { PartnershipSection } from '@/components/landing/partnership-section';
import { CtaFooter } from '@/components/landing/cta-footer';

export function LandingPage() {
  return (
    <div className="min-h-screen w-full flex flex-col">
      <Navbar />

      <main className="flex-1 w-full">
        <Hero />
        <DailyLifeSection />
        <ManagementSection />
        <PropertyFeaturesSection />
        <OnboardingSection />
        <PartnershipSection />
      </main>

      <CtaFooter />
    </div>
  );
}
