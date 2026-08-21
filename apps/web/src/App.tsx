import { Fragment, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import ScrollToTop from "./components/scroll-to-top";
import { trackPageView } from "./utils/analytics.utils";
import AuthConfirmedPage from "./pages/AuthConfirmedPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import CheckoutCancelPage from "./pages/CheckoutCancelPage";
import DownloadPage from "./pages/DownloadPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import PrivacyPage from "./pages/PrivacyPage";
import PricingPage from "./pages/PricingPage";
import RefundPage from "./pages/RefundPage";
import TermsPage from "./pages/TermsPage";
import TossBillingSuccessPage from "./pages/TossBillingSuccessPage";
import TossCheckoutPage from "./pages/TossCheckoutPage";
import KakaoPaySuccessPage from "./pages/KakaoPaySuccessPage";
import KakaoPayCancelPage from "./pages/KakaoPayCancelPage";
import KakaoPayReviewPage from "./pages/KakaoPayReviewPage";
import KakaoPayOneTimeReviewPage from "./pages/KakaoPayOneTimeReviewPage";

function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <Fragment>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/confirmed" element={<AuthConfirmedPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        <Route path="/checkout/toss" element={<TossCheckoutPage />} />
        <Route
          path="/checkout/toss/success"
          element={<TossBillingSuccessPage />}
        />
        <Route
          path="/checkout/kakaopay/success"
          element={<KakaoPaySuccessPage />}
        />
        <Route
          path="/checkout/kakaopay/review"
          element={<KakaoPayReviewPage />}
        />
        <Route path="/checkout/kakaopay/one-time/review" element={<KakaoPayOneTimeReviewPage />} />
        <Route
          path="/checkout/kakaopay/cancel"
          element={<KakaoPayCancelPage />}
        />
        <Route
          path="/checkout/kakaopay/fail"
          element={<KakaoPayCancelPage />}
        />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund" element={<RefundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Fragment>
  );
}

export default App;
