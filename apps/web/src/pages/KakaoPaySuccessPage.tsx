import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import pageStyles from "../styles/page.module.css";
import styles from "./auth-confirmed.module.css";

export default function KakaoPaySuccessPage() {
  const intl = useIntl();
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const orderId = params.get("orderId");
    const pgToken = params.get("pg_token");
    if (!orderId || !pgToken || !supabase) {
      setState("error");
      return;
    }
    void supabase.functions
      .invoke("kakaopay-approve", { body: { orderId, pgToken } })
      .then(({ error }) => setState(error ? "error" : "success"));
  }, [params]);

  return (
    <BaseLayout
      title={intl.formatMessage({
        defaultMessage: "Kakao Pay Payment Status | Vocally",
      })}
      description={intl.formatMessage({
        defaultMessage: "Confirming your Vocally Pro payment.",
      })}
    >
      <PageLayout>
        <section className={styles.container}>
          <h1 className={styles.title}>
            {state === "success"
              ? "Payment Successful"
              : state === "error"
                ? "Payment Failed"
                : "Confirming Payment"}
          </h1>
          {state === "loading" && (
            <p className={styles.subtitle}>
              <FormattedMessage defaultMessage="Confirming your payment..." />
            </p>
          )}
          {state === "success" && (
            <>
              <p className={styles.subtitle}>
                <FormattedMessage defaultMessage="Your Pro plan is now active. Download the app to get started." />
              </p>
              <Link to="/download" className={pageStyles.primaryButton}>
                <FormattedMessage defaultMessage="Download Vocally" />
              </Link>
            </>
          )}
          {state === "error" && (
            <p className={styles.subtitle}>
              <FormattedMessage defaultMessage="We could not confirm this payment. Please contact slit.amazing@gmail.com." />
            </p>
          )}
        </section>
      </PageLayout>
    </BaseLayout>
  );
}
