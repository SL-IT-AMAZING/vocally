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
  const isKorean = intl.locale.startsWith("ko");
  const copy = isKorean
    ? {
        title: "카카오페이 결제 검토 | Vocally",
        description:
          "카카오페이 결제 전 Vocally Pro 월간 구독 정보를 확인하세요.",
        eyebrow: "카카오페이 결제 검토",
        plan: "Vocally Pro 월간 이용권",
        subtitle: "카카오페이로 이동하기 전 구독 정보를 확인해주세요.",
        product: "상품",
        productValue: "Vocally Pro 월간 구독",
        billing: "결제 금액",
        billingSuffix: " /월, 정기결제",
        account: "계정",
        signInRequired: "로그인 필요",
        delivery: "제공 방식",
        deliveryValue: "디지털 소프트웨어 - 배송지 입력이 필요하지 않습니다.",
        policyPrefix: "계속 진행하면 ",
        policyAnd: " 및 ",
        policySuffix: "을 확인할 수 있습니다.",
        payment: "카카오페이로 결제하기",
        preparing: "카카오페이 결제 준비 중...",
        pending:
          "카카오페이 가맹 심사 진행 중입니다. 이 화면은 심사용으로 제공되며, 현재 실제 결제는 진행되지 않습니다.",
      }
    : {
        title: "Kakao Pay Order Review | Vocally",
        description:
          "Review the Vocally Pro monthly subscription before Kakao Pay payment.",
        eyebrow: "Kakao Pay order review",
        plan: "Vocally Pro Monthly",
        subtitle: "Review your subscription before continuing to Kakao Pay.",
        product: "Product",
        productValue: "Vocally Pro Monthly subscription",
        billing: "Billing",
        billingSuffix: " / month, recurring",
        account: "Account",
        signInRequired: "Sign in required",
        delivery: "Delivery",
        deliveryValue: "Digital software - no shipping address is required.",
        policyPrefix: "By continuing, you can review the ",
        policyAnd: " and ",
        policySuffix: ".",
        payment: "Pay with Kakao Pay",
        preparing: "Preparing Kakao Pay...",
        pending:
          "Kakao Pay payment is pending merchant approval. This screen is provided for review only; no payment is collected yet.",
      };
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
      setNotice(
        "결제 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    setPaymentLoading(true);
    setNotice(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "kakaopay-ready",
        {
          body: { plan: KAKAOPAY_MONTHLY_PLAN },
        },
      );
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
    <BaseLayout title={copy.title} description={copy.description}>
      <PageLayout>
        <section
          className={styles.container}
          aria-labelledby="kakaopay-review-title"
        >
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1 id="kakaopay-review-title" className={styles.title}>
            {copy.plan}
          </h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>

          <dl className={styles.summary}>
            <div>
              <dt>{copy.product}</dt>
              <dd>{copy.productValue}</dd>
            </div>
            <div>
              <dt>{copy.billing}</dt>
              <dd>
                {new Intl.NumberFormat(intl.locale, {
                  style: "currency",
                  currency: "KRW",
                  maximumFractionDigits: 0,
                }).format(KAKAOPAY_MONTHLY_PRICE_KRW)}
                {copy.billingSuffix}
              </dd>
            </div>
            <div>
              <dt>{copy.account}</dt>
              <dd>{loading ? "-" : (user?.email ?? copy.signInRequired)}</dd>
            </div>
            <div>
              <dt>{copy.delivery}</dt>
              <dd>{copy.deliveryValue}</dd>
            </div>
          </dl>

          <p className={styles.policy}>
            {copy.policyPrefix}
            <Link to="/terms">
              <FormattedMessage defaultMessage="Terms of Service" />
            </Link>
            {copy.policyAnd}
            <Link to="/refund">
              <FormattedMessage defaultMessage="Refund Policy" />
            </Link>
            {copy.policySuffix}
          </p>

          <button
            type="button"
            className={pageStyles.primaryButton}
            onClick={() => void startPayment()}
            disabled={paymentLoading}
          >
            {paymentLoading ? copy.preparing : copy.payment}
          </button>
          {!KAKAOPAY_ENABLED && (
            <p className={styles.pending}>{copy.pending}</p>
          )}
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
        </section>
      </PageLayout>
    </BaseLayout>
  );
}
