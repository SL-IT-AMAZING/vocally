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
          "Simple, transparent pricing for Vocally. Free Personal, plus Pro Monthly (₩7,000), Semiannual (₩39,000), and Annual (₩70,000) plans.",
      })}
    >
      <PageLayout>
        <PricingSection />
      </PageLayout>
    </BaseLayout>
  );
}

export default PricingPage;
