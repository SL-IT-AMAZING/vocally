export type FullConfig = {
  freeWordsPerDay: number;
  freeWordsPerMonth: number;
  freeTokensPerDay: number;
  freeTokensPerMonth: number;
  proWordsPerDay: number;
  proWordsPerMonth: number;
  proTokensPerDay: number;
  proTokensPerMonth: number;
};

const TOKEN_MULT = 18;
const FREE_WORDS_PER_MONTH = 500;
const FREE_TOKENS_PER_MONTH = FREE_WORDS_PER_MONTH * TOKEN_MULT;
const PRO_WORDS_PER_MONTH = 100_000;
const PRO_TOKENS_PER_MONTH = PRO_WORDS_PER_MONTH * TOKEN_MULT;

export const FULL_CONFIG: FullConfig = {
  freeWordsPerDay: Number.MAX_SAFE_INTEGER,
  freeWordsPerMonth: FREE_WORDS_PER_MONTH,
  freeTokensPerDay: Number.MAX_SAFE_INTEGER,
  freeTokensPerMonth: FREE_TOKENS_PER_MONTH,
  proWordsPerDay: Number.MAX_SAFE_INTEGER,
  proWordsPerMonth: PRO_WORDS_PER_MONTH,
  proTokensPerDay: Number.MAX_SAFE_INTEGER,
  proTokensPerMonth: PRO_TOKENS_PER_MONTH,
};
