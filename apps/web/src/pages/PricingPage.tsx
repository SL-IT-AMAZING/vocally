import { useIntl } from "react-intl";
import PricingSection from "../components/pricing-section";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";

function PricingPage() {
  const intl = useIntl();

  return (
    <BaseLayout
      title={intl.formatMessage({ defaultMessage: "Pricing | Vocally" })}
      description={intl.formatMessage({
        defaultMessage:
          "Simple, transparent pricing for Vocally. Free personal plan, ₩7,000/month or ₩70,000/year Pro plan, and custom enterprise solutions.",
      })}
    >
      <PageLayout>
        <PricingSection />
      </PageLayout>
    </BaseLayout>
  );
}

export default PricingPage;
