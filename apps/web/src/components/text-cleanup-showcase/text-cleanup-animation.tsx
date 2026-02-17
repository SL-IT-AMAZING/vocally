import { useEffect, useState, useRef, useCallback } from "react";
import { useIntl } from "react-intl";
import styles from "./text-cleanup-animation.module.css";

type CleanupType = "filler" | "typo" | "hesitation";

interface WordToken {
  id: number;
  text: string;
  cleanup?: {
    type: CleanupType;
    label: string;
    replacement?: string;
  };
}

type WordPhase = "hidden" | "typing" | "visible" | "flagged" | "cleaned";

interface WordState {
  phase: WordPhase;
  charIndex: number;
}

const EN_TOKENS: WordToken[] = [
  {
    id: 1,
    text: "Let's...",
    cleanup: { type: "filler", label: "False start" },
  },
  { id: 2, text: "Let's" },
  { id: 3, text: "sync" },
  { id: 4, text: "with" },
  { id: 5, text: "um,", cleanup: { type: "hesitation", label: "Hesitation" } },
  { id: 6, text: "Minji" },
  { id: 7, text: "tomorrow" },
  { id: 8, text: "morning" },
  { id: 9, text: "at" },
  {
    id: 10,
    text: "10a.m.",
    cleanup: { type: "typo", label: "Spelling", replacement: "10am." },
  },
  { id: 11, text: "the" },
  { id: 12, text: "cafe." },
];

const KO_TOKENS: WordToken[] = [
  {
    id: 1,
    text: "아니...",
    cleanup: { type: "filler", label: "헛시작" },
  },
  { id: 2, text: "내일" },
  { id: 3, text: "오전" },
  { id: 4, text: "음,", cleanup: { type: "hesitation", label: "머뭇거림" } },
  {
    id: 5,
    text: "10시요.",
    cleanup: { type: "typo", label: "맞춤법", replacement: "10시." },
  },
  { id: 6, text: "민지랑" },
  { id: 7, text: "카페에서" },
  { id: 8, text: "만나자." },
];

// Timing constants (ms)
const CHAR_DELAY = 50;
const WORD_PAUSE = 200;
const FLAG_DELAY = 500;
const CLEAN_DELAY = 700;
const RESTART_DELAY = 3000;

const createInitialStates = (tokens: WordToken[]): WordState[] =>
  tokens.map(() => ({ phase: "hidden" as const, charIndex: 0 }));

export default function TextCleanupAnimation() {
  const intl = useIntl();
  const isKorean = intl.locale.startsWith("ko");
  const tokens = isKorean ? KO_TOKENS : EN_TOKENS;
  const [wordStates, setWordStates] = useState<WordState[]>(() =>
    createInitialStates(tokens),
  );
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef({ wordIndex: 0, isRunning: true });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (callback: () => void, delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(callback, delay);
    },
    [clearTimer],
  );

  const tick = useCallback(() => {
    if (!animationRef.current.isRunning) return;

    setWordStates((prevStates) => {
      const { wordIndex } = animationRef.current;

      // Animation complete - schedule restart
      if (wordIndex >= tokens.length) {
        setIsComplete(true);
        scheduleNext(() => {
          animationRef.current.wordIndex = 0;
          setIsComplete(false);
          setWordStates(createInitialStates(tokens));
          scheduleNext(tick, 100);
        }, RESTART_DELAY);
        return prevStates;
      }

      const token = tokens[wordIndex]!;
      const state = prevStates[wordIndex]!;
      const newStates = [...prevStates];

      switch (state.phase) {
        case "hidden":
          // Start typing
          newStates[wordIndex] = { phase: "typing", charIndex: 1 };
          scheduleNext(tick, CHAR_DELAY);
          break;

        case "typing":
          if (state.charIndex < token.text.length) {
            // Continue typing
            newStates[wordIndex] = {
              phase: "typing",
              charIndex: state.charIndex + 1,
            };
            scheduleNext(tick, CHAR_DELAY);
          } else {
            // Word complete
            newStates[wordIndex] = {
              phase: "visible",
              charIndex: state.charIndex,
            };
            if (token.cleanup) {
              scheduleNext(tick, FLAG_DELAY);
            } else {
              // Move to next word
              animationRef.current.wordIndex++;
              scheduleNext(tick, WORD_PAUSE);
            }
          }
          break;

        case "visible":
          if (token.cleanup) {
            // Flag this word
            newStates[wordIndex] = {
              phase: "flagged",
              charIndex: state.charIndex,
            };
            scheduleNext(tick, CLEAN_DELAY);
          }
          break;

        case "flagged":
          // Clean up
          newStates[wordIndex] = {
            phase: "cleaned",
            charIndex: state.charIndex,
          };
          animationRef.current.wordIndex++;
          scheduleNext(tick, WORD_PAUSE);
          break;

        case "cleaned":
          // Already cleaned, move on
          animationRef.current.wordIndex++;
          scheduleNext(tick, WORD_PAUSE);
          break;
      }

      return newStates;
    });
  }, [scheduleNext, tokens]);

  // Start animation on mount
  useEffect(() => {
    animationRef.current.isRunning = true;
    animationRef.current.wordIndex = 0;
    setWordStates(createInitialStates(tokens));
    setIsComplete(false);
    scheduleNext(tick, 500); // Initial delay before starting

    return () => {
      animationRef.current.isRunning = false;
      clearTimer();
    };
  }, [tick, scheduleNext, clearTimer, tokens]);

  const renderWord = (token: WordToken, state: WordState) => {
    const { phase, charIndex } = state;
    const { text, cleanup } = token;

    if (phase === "hidden") {
      return null;
    }

    const displayText = phase === "typing" ? text.slice(0, charIndex) : text;
    const isRemoval = cleanup && !cleanup.replacement;
    const hasReplacement = cleanup?.replacement;

    const wordClasses = [
      styles.word,
      phase === "flagged" && styles.wordFlagged,
      phase === "cleaned" && isRemoval && styles.wordRemoved,
      phase === "cleaned" && hasReplacement && styles.wordReplaced,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <span className={styles.wordContainer} key={token.id}>
        <span className={wordClasses}>{displayText}</span>

        {/* Cleanup label */}
        {cleanup && (phase === "flagged" || phase === "cleaned") && (
          <span
            className={`${styles.label} ${phase === "cleaned" ? styles.labelDone : ""}`}
            data-type={cleanup.type}
          >
            {cleanup.label}
          </span>
        )}

        {/* Replacement word */}
        {hasReplacement && phase === "cleaned" && (
          <span className={styles.replacement}>{cleanup.replacement}</span>
        )}

        <span className={styles.space}> </span>
      </span>
    );
  };

  const cleanedText = isKorean
    ? "내일 오전 10시, 민지랑 카페에서 만나자."
    : "Let's sync with Minji tomorrow morning at 10am at the cafe.";

  return (
    <div className={styles.container}>
      <div className={styles.transcriptBox}>
        <div className={styles.transcript}>
          {tokens.map((token, i) => {
            const state = wordStates[i];
            if (!state) return null;
            return renderWord(token, state);
          })}
        </div>
      </div>

      <div className={styles.arrow}>
        <svg
          className={styles.arrowIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      </div>

      <div
        className={`${styles.resultBox} ${isComplete ? styles.resultBoxComplete : styles.resultBoxPending}`}
      >
        <div
          className={`${styles.resultText} ${isComplete ? styles.resultTextVisible : ""}`}
        >
          {isComplete ? cleanedText : ""}
        </div>
      </div>
    </div>
  );
}
