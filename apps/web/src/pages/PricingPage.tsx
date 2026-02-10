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
          "Simple, transparent pricing for Vocally. Free personal plan, $5/month Pro plan, and custom enterprise solutions.",
      })}
    >
      <PageLayout>
        <PricingSection />
      </PageLayout>
    </BaseLayout>
  );
}

export default PricingPage;
