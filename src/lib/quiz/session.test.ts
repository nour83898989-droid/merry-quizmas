/**
 * Property-Based Tests for Quiz Session Logic
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  shuffleArray,
  hasExistingAttempt,
  isAnswerAlreadySubmitted,
  isWithinTimeLimit,
  isEligibleForReward,
  calculateRewardPerWinner,
  sortWinnersByTime,
} from './session';
import type { Answer } from './types';

// Helper generators
const questionArbitrary = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 6 }),
  correctIndex: fc.nat({ max: 5 }),
}).map(q => ({
  ...q,
  correctIndex: Math.min(q.correctIndex, q.options.length - 1),
}));

const answerArbitrary = fc.record({
  questionId: fc.uuid(),
  selectedIndex: fc.nat({ max: 5 }),
  timestamp: fc.integer({ min: 1000000000000, max: 2000000000000 }),
  serverTimestamp: fc.integer({ min: 1000000000000, max: 2000000000000 }),
});

describe('Session Logic', () => {
  /**
   * Property 4: Duplicate Attempt Prevention
   * For any wallet address and quiz combination, if an attempt already exists,
   * subsequent attempts should be rejected.
   * 
   * **Feature: quiz-app, Property 4: Duplicate Attempt Prevention**
   * **Validates: Requirements 2.4, 15.1**
   */
  describe('Property 4: Duplicate Attempt Prevention', () => {
    it('should detect existing attempt for same wallet and quiz', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.array(fc.record({
            wallet_address: fc.uuid(),
            quiz_id: fc.uuid(),
          }), { minLength: 0, maxLength: 10 }),
          (walletAddress, quizId, otherAttempts) => {
            // Add the target attempt
            const attempts = [
              ...otherAttempts,
              { wallet_address: walletAddress, quiz_id: quizId },
            ];
            
            return hasExistingAttempt(attempts, walletAddress, quizId) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect attempt for different wallet or quiz', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          (wallet1, wallet2, quiz1, quiz2) => {
            // Ensure they're different
            fc.pre(wallet1 !== wallet2 || quiz1 !== quiz2);
            
            const attempts = [{ wallet_address: wallet1, quiz_id: quiz1 }];
            
            return hasExistingAttempt(attempts, wallet2, quiz2) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Answer Immutability
   * For any submitted answer in an active session, the answer should be locked
   * and cannot be modified after submission.
   * 
   * **Feature: quiz-app, Property 5: Answer Immutability**
   * **Validates: Requirements 3.2**
   */
  describe('Property 5: Answer Immutability', () => {
    it('should detect already submitted answer', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(answerArbitrary, { minLength: 0, maxLength: 10 }),
          (questionId, otherAnswers) => {
            const answers: Answer[] = [
              ...otherAnswers,
              {
                questionId,
                selectedIndex: 0,
                timestamp: Date.now(),
                serverTimestamp: Date.now(),
              },
            ];
            
            return isAnswerAlreadySubmitted(answers, questionId) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect answer for different question', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          (questionId1, questionId2) => {
            fc.pre(questionId1 !== questionId2);
            
            const answers: Answer[] = [{
              questionId: questionId1,
              selectedIndex: 0,
              timestamp: Date.now(),
              serverTimestamp: Date.now(),
            }];
            
            return isAnswerAlreadySubmitted(answers, questionId2) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Question Order Randomization
   * For any quiz with multiple questions, different sessions should receive
   * questions in different orders.
   * 
   * **Feature: quiz-app, Property 6: Question Order Randomization**
   * **Validates: Requirements 3.5**
   */
  describe('Property 6: Question Order Randomization', () => {
    it('should produce different orders with different seeds', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 5, maxLength: 20 }),
          fc.integer(),
          fc.integer(),
          (items, seed1, seed2) => {
            fc.pre(seed1 !== seed2);
            
            const shuffled1 = shuffleArray(items, seed1);
            const shuffled2 = shuffleArray(items, seed2);
            
            // At least one position should be different (statistically very likely)
            // For small arrays, they might accidentally be the same
            if (items.length < 3) return true;
            
            return shuffled1.some((item, i) => item !== shuffled2[i]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all elements after shuffle', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
          (items) => {
            const shuffled = shuffleArray(items);
            
            // Same length
            if (shuffled.length !== items.length) return false;
            
            // Same elements (sorted)
            const sortedOriginal = [...items].sort();
            const sortedShuffled = [...shuffled].sort();
            
            return sortedOriginal.every((item, i) => item === sortedShuffled[i]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Server-Side Time Validation
   * For any answer submission, the server timestamp should be used for time
   * validation, not the client-provided timestamp.
   * 
   * **Feature: quiz-app, Property 11: Server-Side Time Validation**
   * **Validates: Requirements 15.2**
   */
  describe('Property 11: Server-Side Time Validation', () => {
    it('should accept answers within time limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 1500000000000 }),
          fc.integer({ min: 5000, max: 60000 }),
          fc.integer({ min: 0, max: 100 }),
          (questionStartTime, timeLimit, percentElapsed) => {
            // Calculate server timestamp within limit
            const elapsed = Math.floor((timeLimit * percentElapsed) / 100);
            const serverTimestamp = questionStartTime + elapsed;
            
            return isWithinTimeLimit(serverTimestamp, questionStartTime, timeLimit) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject answers after time limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 1500000000000 }),
          fc.integer({ min: 5000, max: 60000 }),
          fc.integer({ min: 1, max: 10000 }),
          (questionStartTime, timeLimit, extraTime) => {
            // Calculate server timestamp after limit
            const serverTimestamp = questionStartTime + timeLimit + extraTime;
            
            return isWithinTimeLimit(serverTimestamp, questionStartTime, timeLimit) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Session Timeout Enforcement
   * For any answer submission after the question time limit has expired,
   * the answer should be rejected or marked as timeout.
   * 
   * **Feature: quiz-app, Property 12: Session Timeout Enforcement**
   * **Validates: Requirements 16.2**
   */
  describe('Property 12: Session Timeout Enforcement', () => {
    it('should correctly identify timeout based on server time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 1500000000000 }),
          fc.integer({ min: 5000, max: 60000 }),
          fc.boolean(),
          (questionStartTime, timeLimit, isLate) => {
            const serverTimestamp = isLate
              ? questionStartTime + timeLimit + 1000
              : questionStartTime + Math.floor(timeLimit / 2);
            
            const withinLimit = isWithinTimeLimit(serverTimestamp, questionStartTime, timeLimit);
            
            return withinLimit === !isLate;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Winner Determination', () => {
  /**
   * Property 7: Winner Eligibility - All Correct
   * For any quiz session where all answers are correct and submitted within
   * time limits, the participant should be marked as eligible for reward.
   * 
   * **Feature: quiz-app, Property 7: Winner Eligibility - All Correct**
   * **Validates: Requirements 4.1**
   */
  describe('Property 7: Winner Eligibility - All Correct', () => {
    it('should mark eligible when all answers correct and within time', () => {
      fc.assert(
        fc.property(
          fc.array(questionArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 1000000000000, max: 1500000000000 }),
          fc.integer({ min: 15000, max: 60000 }),
          (questions, sessionStartTime, timePerQuestionMs) => {
            // Create correct answers within time
            const answers: Answer[] = questions.map((q, index) => ({
              questionId: q.id,
              selectedIndex: q.correctIndex,
              timestamp: sessionStartTime + (index * timePerQuestionMs) + 1000,
              serverTimestamp: sessionStartTime + (index * timePerQuestionMs) + 1000,
            }));
            
            return isEligibleForReward(answers, questions, sessionStartTime, timePerQuestionMs) === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Winner Eligibility - Any Incorrect
   * For any quiz session where at least one answer is incorrect,
   * the participant should NOT be eligible for reward.
   * 
   * **Feature: quiz-app, Property 8: Winner Eligibility - Any Incorrect**
   * **Validates: Requirements 4.2**
   */
  describe('Property 8: Winner Eligibility - Any Incorrect', () => {
    it('should not be eligible when any answer is incorrect', () => {
      fc.assert(
        fc.property(
          fc.array(questionArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 1000000000000, max: 1500000000000 }),
          fc.integer({ min: 15000, max: 60000 }),
          fc.nat(),
          (questions, sessionStartTime, timePerQuestionMs, wrongIndex) => {
            const wrongQuestionIndex = wrongIndex % questions.length;
            
            // Create answers with one wrong
            const answers: Answer[] = questions.map((q, index) => ({
              questionId: q.id,
              selectedIndex: index === wrongQuestionIndex
                ? (q.correctIndex + 1) % q.options.length // Wrong answer
                : q.correctIndex,
              timestamp: sessionStartTime + (index * timePerQuestionMs) + 1000,
              serverTimestamp: sessionStartTime + (index * timePerQuestionMs) + 1000,
            }));
            
            return isEligibleForReward(answers, questions, sessionStartTime, timePerQuestionMs) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Reward Calculation
   * For any reward pool amount and winner limit, the reward per winner
   * should equal pool divided by winner limit.
   * 
   * **Feature: quiz-app, Property 9: Reward Calculation**
   * **Validates: Requirements 5.3**
   */
  describe('Property 9: Reward Calculation', () => {
    it('should calculate reward as pool divided by winner limit', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10n ** 30n }),
          fc.integer({ min: 1, max: 10000 }),
          (totalPool, winnerLimit) => {
            const reward = calculateRewardPerWinner(totalPool, winnerLimit);
            const expected = totalPool / BigInt(winnerLimit);
            
            return reward === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for zero or negative winner limit', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10n ** 30n }),
          fc.integer({ min: -100, max: 0 }),
          (totalPool, winnerLimit) => {
            const reward = calculateRewardPerWinner(totalPool, winnerLimit);
            return reward === 0n;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Leaderboard Ordering
   * For any set of winners, the leaderboard should be ordered by completion
   * time in ascending order (fastest first).
   * 
   * **Feature: quiz-app, Property 10: Leaderboard Ordering**
   * **Validates: Requirements 6.2**
   */
  describe('Property 10: Leaderboard Ordering', () => {
    it('should sort winners by completion time ascending', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              completionTimeMs: fc.integer({ min: 1000, max: 1000000 }),
              createdAt: fc.integer({ min: 1000000000000, max: 2000000000000 })
                .map(ts => new Date(ts).toISOString()),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (winners) => {
            const sorted = sortWinnersByTime(winners);
            
            // Check ascending order
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].completionTimeMs < sorted[i - 1].completionTimeMs) {
                return false;
              }
              // If same time, check timestamp order
              if (sorted[i].completionTimeMs === sorted[i - 1].completionTimeMs) {
                const time1 = new Date(sorted[i - 1].createdAt).getTime();
                const time2 = new Date(sorted[i].createdAt).getTime();
                if (time2 < time1) return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all winners after sorting', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              completionTimeMs: fc.integer({ min: 1000, max: 1000000 }),
              createdAt: fc.integer({ min: 1000000000000, max: 2000000000000 })
                .map(ts => new Date(ts).toISOString()),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (winners) => {
            const sorted = sortWinnersByTime(winners);
            return sorted.length === winners.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
