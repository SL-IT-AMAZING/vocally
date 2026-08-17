import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useSearchParams } from "react-router-dom";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import pageStyles from "../styles/page.module.css";
import styles from "./auth-confirmed.module.css";

type TossPayment = {
  requestBillingAuth: (params: {
    method: "CARD";
    successUrl: string;
    failUrl: string;
  }) => Promise<void>;
};

type TossPaymentsFactory = (clientKey: string) => {
  payment: (params: { customerKey: string }) => TossPayment;
};

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

function loadTossSdk(): Promise<void> {
  if (window.TossPayments) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-toss-sdk="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Toss SDK failed to load")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.dataset.tossSdk = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Toss SDK failed to load")),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function TossCheckoutPage() {
  const intl = useIntl();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderId = params.get("orderId");
  const customerKey = params.get("customerKey");
  const amount = Number(params.get("amount"));
  const orderName = params.get("orderName") ?? "Vocally Pro 이용권";
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

  const startPayment = async () => {
    if (!orderId || !customerKey || !Number.isInteger(amount) || !clientKey) {
      setError("Payment information is missing. Please start again.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await loadTossSdk();
      if (!window.TossPayments) throw new Error("Toss SDK is unavailable");
      const payment = window.TossPayments(clientKey).payment({ customerKey });
      const successUrl = new URL(
        "/checkout/toss/success",
        window.location.origin,
      );
      successUrl.searchParams.set("orderId", orderId);
      const failUrl = new URL("/checkout/cancel", window.location.origin);
      failUrl.searchParams.set("orderId", orderId);
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
      });
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Payment failed.",
      );
      setLoading(false);
    }
  };

  return (
    <BaseLayout
      title={intl.formatMessage({ defaultMessage: "Vocally Pro Checkout" })}
      description={intl.formatMessage({
        defaultMessage: "Subscribe to Vocally Pro with Toss Payments.",
      })}
    >
      <PageLayout>
        <section className={styles.container}>
          <h1 className={styles.title}>
            <FormattedMessage defaultMessage="Vocally Pro" />
          </h1>
          <p className={styles.subtitle}>{orderName}</p>
          <p className={styles.subtitle}>
            {Number.isInteger(amount)
              ? new Intl.NumberFormat(intl.locale, {
                  style: "currency",
                  currency: "KRW",
                  maximumFractionDigits: 0,
                }).format(amount)
              : "-"}
          </p>
          {error && <p className={styles.hint}>{error}</p>}
          <button
            type="button"
            className={pageStyles.primaryButton}
            onClick={() => void startPayment()}
            disabled={loading}
          >
            {loading ? (
              <FormattedMessage defaultMessage="Opening payment..." />
            ) : (
              <FormattedMessage defaultMessage="Continue to payment" />
            )}
          </button>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default TossCheckoutPage;
