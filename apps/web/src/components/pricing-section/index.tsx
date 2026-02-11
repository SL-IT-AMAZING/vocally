import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase";
import pageStyles from "../../styles/page.module.css";
import { DownloadButton } from "../download-button";
import styles from "./pricing-section.module.css";

const POLAR_PRODUCT_MONTHLY = "25bf6350-bebc-4b9f-b896-66767ce9304a";
const POLAR_PRODUCT_YEARLY = "d73b4531-65c2-4eb8-976d-b6fcc1ae99e5";

type Feature = { text: string; deemphasized?: boolean };

type PricingPlan = {
  name: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: Feature[];
  cta: string;
  popular: boolean;
  isLifetime?: boolean;
};

function usePricingPlans(): PricingPlan[] {
  const intl = useIntl();
  return [
    {
      name: "Personal",
      description: intl.formatMessage({
        defaultMessage: "For individuals who want fast, local dictation.",
      }),
      monthlyPrice: 0,
      yearlyPrice: null,
      features: [
        { text: intl.formatMessage({ defaultMessage: "AI dictation" }) },
        {
          text: intl.formatMessage({
            defaultMessage: "Bring your own API key",
          }),
        },
        { text: intl.formatMessage({ defaultMessage: "Offline mode" }) },
        {
          text: intl.formatMessage({ defaultMessage: "Smart autocorrect" }),
        },
        {
          text: intl.formatMessage({ defaultMessage: "Community support" }),
        },
        {
          text: intl.formatMessage({
            defaultMessage: "Basic agent mode",
          }),
          deemphasized: true,
        },
      ],
      cta: intl.formatMessage({ defaultMessage: "Download free" }),
      popular: false,
      isLifetime: true,
    },
    {
      name: "Pro",
      description: intl.formatMessage({
        defaultMessage:
          "Full power with cloud transcription and advanced integrations.",
      }),
      monthlyPrice: 5,
      yearlyPrice: 50,
      features: [
        {
          text: intl.formatMessage({
            defaultMessage: "Everything in Personal",
          }),
          deemphasized: true,
        },
        { text: intl.formatMessage({ defaultMessage: "AI dictation" }) },
        {
          text: intl.formatMessage({ defaultMessage: "Cross-device sync" }),
        },
        {
          text: intl.formatMessage({
            defaultMessage: "Unlimited words per month",
          }),
        },
        {
          text: intl.formatMessage({ defaultMessage: "Priority support" }),
        },
      ],
      cta: intl.formatMessage({ defaultMessage: "Get Pro" }),
      popular: true,
    },
  ];
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ProSubscribeButton({
  isYearly,
  className,
}: {
  isYearly: boolean;
  className?: string;
}) {
  const { user, openSignInModal } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const intl = useIntl();

  const handleSubscribe = async () => {
    if (!user) {
      openSignInModal();
      return;
    }

    if (!supabase) return;

    setCheckoutLoading(true);
    try {
      const productId = isYearly ? POLAR_PRODUCT_YEARLY : POLAR_PRODUCT_MONTHLY;

      const { data, error } = await supabase.functions.invoke(
        "polar-checkout",
        { body: { productId, locale: intl.locale } },
      );

      if (error || !data?.checkoutUrl) {
        console.error("Checkout error:", error);
        return;
      }

      window.location.href = data.checkoutUrl;
    } finally {
      setCheckoutLoading(false);
    }
  };

  const label = user
    ? intl.formatMessage({ defaultMessage: "Subscribe" })
    : intl.formatMessage({ defaultMessage: "Get Started" });

  return (
    <button
      type="button"
      className={className}
      onClick={handleSubscribe}
      disabled={checkoutLoading}
    >
      {label}
    </button>
  );
}

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);
  const pricingPlans = usePricingPlans();

  return (
    <section className={styles.section} id="pricing">
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <span className={pageStyles.badge}>
            <FormattedMessage defaultMessage="Pricing" />
          </span>
          <h2>
            <FormattedMessage defaultMessage="Simple, transparent pricing" />
          </h2>
          <p>
            <FormattedMessage defaultMessage="Choose the plan that works for you. No hidden fees." />
          </p>
        </div>

        {/* Billing Toggle */}
        <div className={styles.billingToggle}>
          <span
            className={`${styles.billingLabel} ${!isYearly ? styles.active : ""}`}
          >
            <FormattedMessage defaultMessage="Monthly" />
          </span>
          <button
            className={styles.toggleButton}
            onClick={() => setIsYearly(!isYearly)}
            aria-label="Toggle billing period"
          >
            <span
              className={`${styles.toggleKnob} ${isYearly ? styles.active : ""}`}
            />
          </button>
          <span
            className={`${styles.billingLabel} ${isYearly ? styles.active : ""}`}
          >
            <FormattedMessage defaultMessage="Yearly" />
          </span>
          <span className={styles.saveBadge}>
            <FormattedMessage defaultMessage="Save 17%" />
          </span>
        </div>

        {/* Pricing Cards */}
        <div className={styles.cardsGrid}>
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.card} ${plan.popular ? styles.popular : ""}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <span className={styles.popularBadge}>
                  <FormattedMessage defaultMessage="Best value" />
                </span>
              )}

              {/* Card Header */}
              <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              {/* Price */}
              <div className={styles.priceContainer}>
                {plan.monthlyPrice !== null ? (
                  plan.monthlyPrice === 0 ? (
                    <>
                      <span className={styles.price}>
                        <FormattedMessage defaultMessage="Free" />
                      </span>
                      <div className={styles.billingNote}>
                        <FormattedMessage defaultMessage="No credit card required" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.priceRow}>
                        <span className={styles.price}>
                          $
                          {isYearly && plan.yearlyPrice
                            ? plan.yearlyPrice
                            : plan.monthlyPrice}
                        </span>
                        <span className={styles.pricePeriod}>
                          {isYearly && plan.yearlyPrice ? (
                            <FormattedMessage defaultMessage="/ year" />
                          ) : (
                            <FormattedMessage defaultMessage="/ month" />
                          )}
                        </span>
                      </div>
                      <div className={styles.billingNote}>
                        {isYearly && plan.yearlyPrice ? (
                          <FormattedMessage defaultMessage="Billed annually" />
                        ) : (
                          <FormattedMessage defaultMessage="Billed monthly" />
                        )}
                      </div>
                    </>
                  )
                ) : null}
              </div>

              {/* CTA Button */}
              {plan.popular ? (
                <ProSubscribeButton
                  isYearly={isYearly}
                  className={styles.ctaButton}
                />
              ) : (
                <DownloadButton
                  className={styles.ctaButtonOutline}
                  trackingId={`pricing-${plan.name.toLowerCase()}`}
                />
              )}

              {/* Features */}
              <div className={styles.featuresSection}>
                <p className={styles.featuresTitle}>
                  <FormattedMessage defaultMessage="What's included" />
                </p>
                <ul className={styles.featuresList}>
                  {plan.features.map((feature) => {
                    const text = feature.text;
                    const deemphasized = feature.deemphasized;
                    return (
                      <li
                        key={text}
                        className={`${styles.featureItem} ${deemphasized ? styles.deemphasized : ""}`}
                      >
                        <CheckIcon className={styles.checkIcon} />
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Signal */}
        <div className={styles.trustSignal}>
          <ShieldIcon className={styles.shieldIcon} />
          <span className={styles.trustText}>
            <strong>
              <FormattedMessage defaultMessage="No hidden fees" />
            </strong>
            {" · "}
            <FormattedMessage defaultMessage="Cancel anytime" />
          </span>
        </div>
      </div>
    </section>
  );
}
