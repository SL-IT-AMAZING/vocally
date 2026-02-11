import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useAuth } from "../../context/auth-context";
import styles from "./sign-in-modal.module.css";

type Mode = "sign-in" | "sign-up";

export default function SignInModal() {
  const {
    isSignInModalOpen,
    closeSignInModal,
    signInWithGoogle,
    signInWithKakao,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const intl = useIntl();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSignInModalOpen) {
      setMode("sign-in");
      setEmail("");
      setPassword("");
      setError(null);
      setSuccess(null);
      setSubmitting(false);
    }
  }, [isSignInModalOpen]);

  useEffect(() => {
    if (!isSignInModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSignInModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSignInModalOpen, closeSignInModal]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeSignInModal();
      }
    },
    [closeSignInModal],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        const err = await signUpWithEmail(email, password);
        if (err) {
          setError(err);
        } else {
          setSuccess(
            intl.formatMessage({
              defaultMessage: "Check your email to confirm your account.",
            }),
          );
        }
      } else {
        const err = await signInWithEmail(email, password);
        if (err) {
          setError(err);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSignInModalOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} ref={modalRef}>
        <button
          className={styles.closeButton}
          onClick={closeSignInModal}
          aria-label={intl.formatMessage({ defaultMessage: "Close" })}
        >
          &times;
        </button>

        <h2 className={styles.title}>
          {mode === "sign-in" ? (
            <FormattedMessage defaultMessage="Sign in to Vocally" />
          ) : (
            <FormattedMessage defaultMessage="Create an account" />
          )}
        </h2>

        <div className={styles.oauthButtons}>
          <button
            type="button"
            className={`${styles.oauthButton} ${styles.googleButton}`}
            onClick={signInWithGoogle}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <FormattedMessage defaultMessage="Continue with Google" />
          </button>

          <button
            type="button"
            className={`${styles.oauthButton} ${styles.kakaoButton}`}
            onClick={signInWithKakao}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#191919"
                d="M9 1C4.58 1 1 3.87 1 7.37c0 2.21 1.47 4.15 3.68 5.25-.16.57-.59 2.07-.67 2.39-.11.39.14.39.3.28.12-.08 1.94-1.32 2.72-1.86.63.09 1.28.14 1.97.14 4.42 0 8-2.87 8-6.37S13.42 1 9 1z"
              />
            </svg>
            <FormattedMessage defaultMessage="Continue with Kakao" />
          </button>
        </div>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <FormattedMessage defaultMessage="or" />
          <span className={styles.dividerLine} />
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="email"
            className={styles.input}
            placeholder={intl.formatMessage({ defaultMessage: "Email" })}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            className={styles.input}
            placeholder={intl.formatMessage({ defaultMessage: "Password" })}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
          />

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {mode === "sign-in" ? (
              <FormattedMessage defaultMessage="Sign in" />
            ) : (
              <FormattedMessage defaultMessage="Create account" />
            )}
          </button>
        </form>

        <div className={styles.switchMode}>
          {mode === "sign-in" ? (
            <>
              <FormattedMessage defaultMessage="Don't have an account?" />
              <button
                type="button"
                className={styles.switchLink}
                onClick={() => {
                  setMode("sign-up");
                  setError(null);
                  setSuccess(null);
                }}
              >
                <FormattedMessage defaultMessage="Sign up" />
              </button>
            </>
          ) : (
            <>
              <FormattedMessage defaultMessage="Already have an account?" />
              <button
                type="button"
                className={styles.switchLink}
                onClick={() => {
                  setMode("sign-in");
                  setError(null);
                  setSuccess(null);
                }}
              >
                <FormattedMessage defaultMessage="Sign in" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
