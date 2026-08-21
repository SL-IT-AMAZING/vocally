import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { supabase } from "../lib/supabase";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import pageStyles from "../styles/page.module.css";
import styles from "./kakaopay-review.module.css";

const ENABLED = import.meta.env.VITE_KAKAOPAY_ONETIME_ENABLED === "true";

export default function KakaoPayOneTimeReviewPage() {
  const { user, loading, openSignInModal } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const startPayment = async () => {
    if (!user) return openSignInModal();
    if (!ENABLED) return setNotice("카카오페이 단건결제 심사 진행 중입니다.");
    if (!supabase) return setNotice("결제 서비스를 불러오지 못했습니다.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("kakaopay-one-time-ready", {
        body: { productKey: "pro_30_day_once" },
      });
      if (error || !data?.checkoutUrl) throw new Error();
      window.location.href = data.checkoutUrl;
    } catch {
      setNotice("결제를 준비하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return <BaseLayout title="Vocally Pro 30일 이용권 | Vocally" description="카카오페이 단건결제 상품 검토">
    <PageLayout><section className={styles.container} aria-labelledby="one-time-review-title">
      <span className={styles.eyebrow}>카카오페이 단건결제</span>
      <h1 id="one-time-review-title" className={styles.title}>Vocally Pro 30일 이용권</h1>
      <p className={styles.subtitle}>결제 전 상품과 이용 조건을 확인해주세요.</p>
      <dl className={styles.summary}>
        <div><dt>상품</dt><dd>Vocally Pro 30일 이용권</dd></div>
        <div><dt>결제 금액</dt><dd>₩7,000 · 결제 1회 · 자동 갱신 없음</dd></div>
        <div><dt>이용 기간</dt><dd>결제 완료일부터 30일간 Pro 기능 제공</dd></div>
        <div><dt>계정</dt><dd>{loading ? "-" : (user?.email ?? "로그인 필요")}</dd></div>
        <div><dt>제공 방식</dt><dd>디지털 소프트웨어 · 배송지 입력이 필요하지 않습니다.</dd></div>
      </dl>
      <p className={styles.policy}>계속 진행하면 <Link to="/terms">이용약관</Link> 및 <Link to="/refund">환불정책</Link>을 확인할 수 있습니다.</p>
      <button type="button" className={pageStyles.primaryButton} onClick={() => void startPayment()} disabled={submitting}>{submitting ? "카카오페이 준비 중..." : "카카오페이로 결제하기"}</button>
      {!ENABLED && <p className={styles.pending}>심사용 화면입니다. 현재 실제 결제는 진행되지 않습니다.</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </section></PageLayout>
  </BaseLayout>;
}
