/**
 * Property-Based Tests for Quiz Serialization
 * 
 * **Feature: quiz-app, Property 13: Quiz Data Round-Trip**
 * **Validates: Requirements 17.4, 17.5**
 * 
 * For any valid quiz object, serializing to JSON and deserializing back
 * should produce an equivalent object.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { 
  serializeQuiz, 
  deserializeQuiz, 
  quizzesAreEqual,
  serializeQuestions,
  deserializeQuestions
} from './serialization';
import type { Quiz } from './types';

// Helper to generate hex string for addresses
const hexAddress = fc.array(
  fc.integer({ min: 0, max: 15 }).map(n => n.toString(16)),
  { minLength: 40, maxLength: 40 }
).map(arr => `0x${arr.join('')}`);

// Arbitrary generators for quiz data
const questionArbitrary = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 500 }),
  options: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 2, maxLength: 6 }),
  correctIndex: fc.nat({ max: 5 }),
}).map(q => ({
  ...q,
  correctIndex: Math.min(q.correctIndex, q.options.length - 1),
}));

const stakeRequirementArbitrary = fc.option(
  fc.record({
    token: hexAddress,
    amount: fc.bigInt({ min: 0n, max: 10n ** 30n }).map(n => n.toString()),
  }),
  { nil: undefined }
);

// Helper to generate valid date string using integer timestamp
const validDateString = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(ts => new Date(ts).toISOString());

const quizArbitrary: fc.Arbitrary<Quiz> = fc.record({
  id: fc.uuid(),
  creatorWallet: hexAddress,
  creatorFid: fc.option(fc.nat({ max: 1000000 }), { nil: undefined }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 1000 }),
  questions: fc.array(questionArbitrary, { minLength: 1, maxLength: 20 }),
  rewardToken: hexAddress,
  rewardAmount: fc.bigInt({ min: 0n, max: 10n ** 30n }).map(n => n.toString()),
  winnerLimit: fc.integer({ min: 1, max: 10000 }),
  timePerQuestion: fc.integer({ min: 5, max: 300 }),
  startTime: fc.option(validDateString, { nil: undefined }),
  endTime: fc.option(validDateString, { nil: undefined }),
  stakeRequirement: stakeRequirementArbitrary,
  nftEnabled: fc.boolean(),
  nftArtworkUrl: fc.option(fc.webUrl(), { nil: undefined }),
  status: fc.constantFrom('draft', 'active', 'completed', 'cancelled') as fc.Arbitrary<'draft' | 'active' | 'completed' | 'cancelled'>,
  currentWinners: fc.nat({ max: 10000 }),
  createdAt: validDateString,
  updatedAt: validDateString,
});

describe('Quiz Serialization - Property 13: Quiz Data Round-Trip', () => {
  /**
   * Property 13: Quiz Data Round-Trip
   * For any valid quiz object, serializing to JSON and deserializing back
   * should produce an equivalent object.
   * 
   * **Validates: Requirements 17.4, 17.5**
   */
  it('should preserve quiz data through serialize/deserialize round-trip', () => {
    fc.assert(
      fc.property(quizArbitrary, (quiz) => {
        const serialized = serializeQuiz(quiz);
        const deserialized = deserializeQuiz(serialized);
        
        return quizzesAreEqual(quiz, deserialized);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve questions through serialize/deserialize round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(questionArbitrary, { minLength: 1, maxLength: 20 }),
        (questions) => {
          const serialized = serializeQuestions(questions);
          const deserialized = deserializeQuestions(serialized);
          
          if (questions.length !== deserialized.length) return false;
          
          return questions.every((q, i) => 
            q.id === deserialized[i].id &&
            q.text === deserialized[i].text &&
            q.correctIndex === deserialized[i].correctIndex &&
            q.options.length === deserialized[i].options.length &&
            q.options.every((opt, j) => opt === deserialized[i].options[j])
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce valid JSON when serializing', () => {
    fc.assert(
      fc.property(quizArbitrary, (quiz) => {
        const serialized = serializeQuiz(quiz);
        
        // Should not throw when parsing
        try {
          JSON.parse(serialized);
          return true;
        } catch {
          return false;
        }
      }),
      { numRuns: 100 }
    );
  });
});
