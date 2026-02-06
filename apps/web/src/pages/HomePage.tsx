import { AppsCarousel } from "../components/apps-carousel";
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

        <AppsCarousel />
        <SpeedShowcase />
        <PrivacyShowcase />
        <TextCleanupShowcase />
        <OfflineShowcase />
        <PricingSection />
      </PageLayout>
    </BaseLayout>
  );
}

export default HomePage;
