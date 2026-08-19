import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { supabase } from "../lib/supabase";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import pageStyles from "../styles/page.module.css";
import styles from "./kakaopay-review.module.css";

const KAKAOPAY_ENABLED = import.meta.env.VITE_KAKAOPAY_ENABLED === "true";
const KAKAOPAY_MONTHLY_PLAN = "monthly";
const KAKAOPAY_MONTHLY_PRICE_KRW = 7_000;

export default function KakaoPayReviewPage() {
  const intl = useIntl();
  const { user, loading, openSignInModal } = useAuth();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const startPayment = async () => {
    if (!user) {
      openSignInModal();
      return;
    }
    if (!KAKAOPAY_ENABLED) {
      setNotice(
        "카카오페이 가맹 심사 진행 중입니다. 심사 완료 후 실제 결제창이 열립니다.",
      );
      return;
    }
    if (!supabase) {
      setNotice("결제 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setPaymentLoading(true);
    setNotice(null);
    try {
      const { data, error } = await supabase.functions.invoke("kakaopay-ready", {
        body: { plan: KAKAOPAY_MONTHLY_PLAN },
      });
      if (error || !data?.checkoutUrl) {
        setNotice(
          "결제를 준비하지 못했습니다. 잠시 후 다시 시도하거나 고객문의로 연락해주세요.",
        );
        return;
      }
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      window.location.href =
        isMobile && data.mobileCheckoutUrl
          ? data.mobileCheckoutUrl
          : data.checkoutUrl;
    } catch {
      setNotice("결제를 준비하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <BaseLayout
      title={intl.formatMessage({ defaultMessage: "Kakao Pay Order Review | Vocally" })}
      description={intl.formatMessage({
        defaultMessage: "Review the Vocally Pro monthly subscription before Kakao Pay payment.",
      })}
    >
      <PageLayout>
        <section className={styles.container} aria-labelledby="kakaopay-review-title">
          <span className={styles.eyebrow}>
            <FormattedMessage defaultMessage="Kakao Pay order review" />
          </span>
          <h1 id="kakaopay-review-title" className={styles.title}>
            <FormattedMessage defaultMessage="Vocally Pro Monthly" />
          </h1>
          <p className={styles.subtitle}>
            <FormattedMessage defaultMessage="Review your subscription before continuing to Kakao Pay." />
          </p>

          <dl className={styles.summary}>
            <div>
              <dt><FormattedMessage defaultMessage="Product" /></dt>
              <dd><FormattedMessage defaultMessage="Vocally Pro Monthly subscription" /></dd>
            </div>
            <div>
              <dt><FormattedMessage defaultMessage="Billing" /></dt>
              <dd>
                {new Intl.NumberFormat(intl.locale, {
                  style: "currency",
                  currency: "KRW",
                  maximumFractionDigits: 0,
                }).format(KAKAOPAY_MONTHLY_PRICE_KRW)}
                <FormattedMessage defaultMessage=" / month, recurring" />
              </dd>
            </div>
            <div>
              <dt><FormattedMessage defaultMessage="Account" /></dt>
              <dd>{loading ? "-" : user?.email ?? "Sign in required"}</dd>
            </div>
            <div>
              <dt><FormattedMessage defaultMessage="Delivery" /></dt>
              <dd><FormattedMessage defaultMessage="Digital software — no shipping address is required." /></dd>
            </div>
          </dl>

          <p className={styles.policy}>
            <FormattedMessage defaultMessage="By continuing, you can review the" /> {" "}
            <Link to="/terms"><FormattedMessage defaultMessage="Terms of Service" /></Link>{" "}
            <FormattedMessage defaultMessage="and" /> {" "}
            <Link to="/refund"><FormattedMessage defaultMessage="Refund Policy" /></Link>.
          </p>

          <button
            type="button"
            className={pageStyles.primaryButton}
            onClick={() => void startPayment()}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <FormattedMessage defaultMessage="Preparing Kakao Pay..." />
            ) : (
              <FormattedMessage defaultMessage="Pay with Kakao Pay" />
            )}
          </button>
          {!KAKAOPAY_ENABLED && (
            <p className={styles.pending}>
              <FormattedMessage defaultMessage="Kakao Pay payment is pending merchant approval. This screen is provided for review only; no payment is collected yet." />
            </p>
          )}
          {notice && <p className={styles.notice} role="status">{notice}</p>}
        </section>
      </PageLayout>
    </BaseLayout>
  );
}
