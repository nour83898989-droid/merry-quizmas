/**
 * Quiz Session Logic
 * Core logic for session management, answer validation, and winner determination
 */

import type { Question, Answer } from './types';

/**
 * Shuffle array using Fisher-Yates algorithm
 * Used for randomizing question order per session
 */
export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const shuffled = [...array];
  
  // Use seeded random if provided (for testing)
  let seedValue = seed;
  const random = seed !== undefined 
    ? () => {
        seedValue = ((seedValue ?? 0) * 1103515245 + 12345) & 0x7fffffff;
        return seedValue / 0x7fffffff;
      }
    : Math.random;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if a wallet has already attempted a quiz
 */
export function hasExistingAttempt(
  attempts: { wallet_address: string; quiz_id: string }[],
  walletAddress: string,
  quizId: string
): boolean {
  return attempts.some(
    a => a.wallet_address === walletAddress && a.quiz_id === quizId
  );
}

/**
 * Check if an answer has already been submitted for a question
 */
export function isAnswerAlreadySubmitted(
  answers: Answer[],
  questionId: string
): boolean {
  return answers.some(a => a.questionId === questionId);
}

/**
 * Validate answer submission time against server time
 * Returns true if within time limit
 */
export function isWithinTimeLimit(
  serverTimestamp: number,
  questionStartTime: number,
  timePerQuestionMs: number
): boolean {
  const elapsed = serverTimestamp - questionStartTime;
  return elapsed <= timePerQuestionMs;
}

/**
 * Check if answer is correct
 */
export function isAnswerCorrect(
  selectedIndex: number,
  correctIndex: number
): boolean {
  return selectedIndex === correctIndex;
}

/**
 * Determine winner eligibility
 * All answers must be correct and within time limits
 */
export function isEligibleForReward(
  answers: Answer[],
  questions: Question[],
  sessionStartTime: number,
  timePerQuestionMs: number
): boolean {
  if (answers.length !== questions.length) return false;

  return answers.every((answer, index) => {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) return false;

    // Check correctness
    if (answer.selectedIndex !== question.correctIndex) return false;

    // Check time limit (using server timestamp)
    const questionStartTime = sessionStartTime + (index * timePerQuestionMs);
    if (answer.serverTimestamp - questionStartTime > timePerQuestionMs) return false;

    return true;
  });
}

/**
 * Calculate reward per winner
 */
export function calculateRewardPerWinner(
  totalPool: bigint,
  winnerLimit: number
): bigint {
  if (winnerLimit <= 0) return 0n;
  return totalPool / BigInt(winnerLimit);
}

/**
 * Sort winners by completion time (ascending - fastest first)
 */
export function sortWinnersByTime(
  winners: { completionTimeMs: number; createdAt: string }[]
): typeof winners {
  return [...winners].sort((a, b) => {
    // Primary sort by completion time
    if (a.completionTimeMs !== b.completionTimeMs) {
      return a.completionTimeMs - b.completionTimeMs;
    }
    // Tiebreaker: earlier timestamp wins
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Check if quiz has reached winner limit
 */
export function hasReachedWinnerLimit(
  currentWinners: number,
  winnerLimit: number
): boolean {
  return currentWinners >= winnerLimit;
}
