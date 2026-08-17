import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase";
import pageStyles from "../../styles/page.module.css";
import { DownloadButton } from "../download-button";
import styles from "./pricing-section.module.css";

const TOSS_PRICE_MONTHLY_KRW = 7_000;
const TOSS_PRICE_YEARLY_KRW = 70_000;

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
      name: intl.formatMessage({ defaultMessage: "Personal" }),
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
      name: intl.formatMessage({ defaultMessage: "Pro" }),
      description: intl.formatMessage({
        defaultMessage:
          "Full power with cloud transcription and advanced integrations.",
      }),
      monthlyPrice: TOSS_PRICE_MONTHLY_KRW,
      yearlyPrice: TOSS_PRICE_YEARLY_KRW,
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const intl = useIntl();

  const handleSubscribe = async () => {
    if (!user) {
      openSignInModal();
      return;
    }

    if (!supabase) {
      setCheckoutError("결제 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const plan = isYearly ? "yearly" : "monthly";

      const { data, error } = await supabase.functions.invoke("toss-checkout", {
        body: { plan },
      });

      if (error || !data?.checkoutUrl) {
        console.error("Checkout error:", error);
        const context = error && "context" in error ? error.context : null;
        const response =
          context && typeof (context as { clone?: unknown }).clone === "function"
            ? (context as Response)
            : null;
        const responseBody = response
          ? ((await response.clone().json().catch(() => null)) as {
              error?: string;
              message?: string;
            } | null)
          : null;
        setCheckoutError(
          responseBody?.error ??
            responseBody?.message ??
            error?.message ??
            "결제 준비에 실패했습니다. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "결제 준비에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const label = user
    ? intl.formatMessage({ defaultMessage: "Subscribe" })
    : intl.formatMessage({ defaultMessage: "Get Started" });

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleSubscribe}
        disabled={checkoutLoading}
      >
        {label}
      </button>
      {checkoutError && (
        <p role="alert" className={styles.checkoutError}>
          {checkoutError}
        </p>
      )}
    </>
  );
}

export default function PricingSection() {
  const intl = useIntl();
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
            <FormattedMessage defaultMessage="Pay for power. Start for free." />
          </h2>
          <p>
            <FormattedMessage defaultMessage="Everything you need to ditch the keyboard — free. Upgrade for cloud sync and unlimited transcription." />
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
            aria-label={intl.formatMessage({
              defaultMessage: "Toggle billing period",
            })}
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
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <h3 className={styles.planName}>
                  {plan.name}
                  {plan.popular && (
                    <span className={styles.popularBadge}>
                      <FormattedMessage defaultMessage="Best value" />
                    </span>
                  )}
                </h3>
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
                          {new Intl.NumberFormat(intl.locale, {
                            style: "currency",
                            currency: "KRW",
                            maximumFractionDigits: 0,
                          }).format(
                            isYearly && plan.yearlyPrice
                              ? plan.yearlyPrice
                              : plan.monthlyPrice,
                          )}
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
