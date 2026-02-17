import { AppsCarousel } from "../components/apps-carousel";
import { FadeInSection } from "../components/common/fade-in-section";
import { HeroSection } from "../components/hero";
import OfflineShowcase from "../components/offline-showcase";
import PricingSection from "../components/pricing-section";
import PrivacyShowcase from "../components/privacy-showcase";
import SpeedShowcase from "../components/speed-showcase";
import TextCleanupShowcase from "../components/text-cleanup-showcase";

import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";

function HomePage() {
  return (
    <BaseLayout>
      <PageLayout>
        <HeroSection />

        <FadeInSection>
          <AppsCarousel />
        </FadeInSection>
        <FadeInSection>
          <SpeedShowcase />
        </FadeInSection>
        <FadeInSection>
          <PrivacyShowcase />
        </FadeInSection>
        <FadeInSection>
          <TextCleanupShowcase />
        </FadeInSection>
        <FadeInSection>
          <OfflineShowcase />
        </FadeInSection>
        <FadeInSection>
          <PricingSection />
        </FadeInSection>
      </PageLayout>
    </BaseLayout>
  );
}

export default HomePage;
