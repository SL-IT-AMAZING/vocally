import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import pageStyles from "../styles/page.module.css";
import styles from "./auth-confirmed.module.css";

export default function KakaoPayOneTimeSuccessPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const orderId = params.get("orderId");
    const pgToken = params.get("pg_token");
    if (!orderId || !pgToken || !supabase) return setState("error");
    void supabase.functions.invoke("kakaopay-one-time-approve", {
      body: { orderId, pgToken },
    })
      .then(({ data, error }) => {
        if (error || !data?.endsAt) return setState("error");
        setEndsAt(data.endsAt);
        setState("success");
      });
  }, [params]);
  return (
    <BaseLayout
      title="카카오페이 단건결제 확인 | Vocally"
      description="단건결제 상태 확인"
    >
      <PageLayout>
        <section className={styles.container}>
          <h1 className={styles.title}>
            {state === "success"
              ? "결제가 완료되었습니다"
              : state === "error"
              ? "결제를 확인하지 못했습니다"
              : "결제를 확인하고 있습니다"}
          </h1>
          <p className={styles.subtitle}>
            {state === "success"
              ? `Vocally Pro 30일 이용권이 활성화되었습니다. 이용 종료일: ${
                new Date(endsAt!).toLocaleDateString("ko-KR")
              }`
              : state === "error"
              ? "결제 상태를 확인할 수 없습니다. slit.amazing@gmail.com으로 문의해주세요."
              : "잠시만 기다려주세요."}
          </p>
          {state === "success" && (
            <Link to="/download" className={pageStyles.primaryButton}>
              Vocally 다운로드
            </Link>
          )}
        </section>
      </PageLayout>
    </BaseLayout>
  );
}
