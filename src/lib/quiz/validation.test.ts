/**
 * Property-Based Tests for Quiz Validation
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  validateQuestion, 
  validateQuizConfig,
  isValidOptionCount,
  isValidCorrectIndex,
  isValidTokenAddress
} from './validation';

// Helper to generate valid hex address
const hexAddress = fc.array(
  fc.integer({ min: 0, max: 15 }).map(n => n.toString(16)),
  { minLength: 40, maxLength: 40 }
).map(arr => `0x${arr.join('')}`);

// Helper to generate non-empty string (with actual content, not just whitespace)
const nonEmptyString = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);

describe('Question Validation', () => {
  /**
   * Property 1: Question Option Count Validation
   * For any question configuration, the system should accept only questions
   * with 2-6 options inclusive, rejecting any configuration outside this range.
   * 
   * **Feature: quiz-app, Property 1: Question Option Count Validation**
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: Question Option Count Validation', () => {
    it('should accept questions with 2-6 options', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }),
          (optionCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => `Option ${i + 1}`);
            const question = {
              id: 'test-id',
              text: 'Test question?',
              options,
              correctIndex: 0,
            };
            
            const result = validateQuestion(question);
            return result.isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject questions with less than 2 options', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1 }),
          (optionCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => `Option ${i + 1}`);
            const question = {
              id: 'test-id',
              text: 'Test question?',
              options,
              correctIndex: 0,
            };
            
            const result = validateQuestion(question);
            return result.isValid === false && 
                   result.errors.some(e => e.includes('at least 2'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject questions with more than 6 options', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 20 }),
          (optionCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => `Option ${i + 1}`);
            const question = {
              id: 'test-id',
              text: 'Test question?',
              options,
              correctIndex: 0,
            };
            
            const result = validateQuestion(question);
            return result.isValid === false && 
                   result.errors.some(e => e.includes('at most 6'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isValidOptionCount should return true for 2-6', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }),
          (count) => isValidOptionCount(count) === true
        ),
        { numRuns: 100 }
      );
    });

    it('isValidOptionCount should return false outside 2-6', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -100, max: 1 }),
            fc.integer({ min: 7, max: 100 })
          ),
          (count) => isValidOptionCount(count) === false
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Single Correct Answer Enforcement
   * For any question, exactly one answer option must be marked as correct.
   * Configurations with zero or multiple correct answers should be rejected.
   * 
   * **Feature: quiz-app, Property 2: Single Correct Answer Enforcement**
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Single Correct Answer Enforcement', () => {
    it('should accept questions with correctIndex within valid range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }),
          (optionCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => `Option ${i + 1}`);
            // Generate valid correctIndex for this option count
            const correctIndex = Math.floor(Math.random() * optionCount);
            
            const question = {
              id: 'test-id',
              text: 'Test question?',
              options,
              correctIndex,
            };
            
            const result = validateQuestion(question);
            return result.isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject questions with correctIndex out of bounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }),
          fc.integer({ min: 6, max: 100 }),
          (optionCount, correctIndex) => {
            const options = Array.from({ length: optionCount }, (_, i) => `Option ${i + 1}`);
            
            const question = {
              id: 'test-id',
              text: 'Test question?',
              options,
              correctIndex,
            };
            
            const result = validateQuestion(question);
            return result.isValid === false && 
                   result.errors.some(e => e.includes('within options range'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject questions with negative correctIndex', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: -1 }),
          (correctIndex) => {
            const question = {
              id: 'test-id',
              text: 'Test question?',
              options: ['A', 'B', 'C'],
              correctIndex,
            };
            
            const result = validateQuestion(question);
            return result.isValid === false && 
                   result.errors.some(e => e.includes('non-negative'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject questions without correctIndex', () => {
      const question = {
        id: 'test-id',
        text: 'Test question?',
        options: ['A', 'B', 'C'],
      };
      
      const result = validateQuestion(question);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Correct answer index is required'))).toBe(true);
    });

    it('isValidCorrectIndex should validate correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }),
          fc.integer({ min: 0, max: 5 }),
          (optionsLength, correctIndex) => {
            const expected = correctIndex >= 0 && correctIndex < optionsLength;
            return isValidCorrectIndex(correctIndex, optionsLength) === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Quiz Config Validation', () => {
  /**
   * Property 3: Required Fields Validation
   * For any quiz submission, if any required field is missing or invalid,
   * the submission should be rejected.
   * 
   * **Feature: quiz-app, Property 3: Required Fields Validation**
   * **Validates: Requirements 1.5**
   */
  describe('Property 3: Required Fields Validation', () => {
    it('should accept valid quiz config with all required fields', () => {
      fc.assert(
        fc.property(
          nonEmptyString,
          hexAddress,
          fc.bigInt({ min: 1n, max: 10n ** 20n }),
          fc.integer({ min: 1, max: 1000 }),
          (title, rewardToken, rewardAmount, winnerLimit) => {
            const config = {
              title: title.slice(0, 100),
              description: 'Test description',
              questions: [{
                id: 'q1',
                text: 'Test question?',
                options: ['A', 'B', 'C'],
                correctIndex: 0,
              }],
              rewardToken,
              rewardAmount: rewardAmount.toString(),
              winnerLimit,
              timePerQuestion: 15,
              nftEnabled: false,
            };
            
            const result = validateQuizConfig(config);
            return result.isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject quiz config without title', () => {
      const config = {
        description: 'Test',
        questions: [{
          id: 'q1',
          text: 'Test?',
          options: ['A', 'B'],
          correctIndex: 0,
        }],
        rewardToken: '0x' + '1'.repeat(40),
        rewardAmount: '1000',
        winnerLimit: 10,
        timePerQuestion: 15,
        nftEnabled: false,
      };
      
      const result = validateQuizConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('title is required'))).toBe(true);
    });

    it('should reject quiz config without questions', () => {
      const config = {
        title: 'Test Quiz',
        description: 'Test',
        questions: [],
        rewardToken: '0x' + '1'.repeat(40),
        rewardAmount: '1000',
        winnerLimit: 10,
        timePerQuestion: 15,
        nftEnabled: false,
      };
      
      const result = validateQuizConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('at least one question'))).toBe(true);
    });

    it('should reject quiz config without rewardToken', () => {
      const config = {
        title: 'Test Quiz',
        description: 'Test',
        questions: [{
          id: 'q1',
          text: 'Test?',
          options: ['A', 'B'],
          correctIndex: 0,
        }],
        rewardAmount: '1000',
        winnerLimit: 10,
        timePerQuestion: 15,
        nftEnabled: false,
      };
      
      const result = validateQuizConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Reward token'))).toBe(true);
    });

    it('should reject quiz config without rewardAmount', () => {
      const config = {
        title: 'Test Quiz',
        description: 'Test',
        questions: [{
          id: 'q1',
          text: 'Test?',
          options: ['A', 'B'],
          correctIndex: 0,
        }],
        rewardToken: '0x' + '1'.repeat(40),
        winnerLimit: 10,
        timePerQuestion: 15,
        nftEnabled: false,
      };
      
      const result = validateQuizConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Reward amount is required'))).toBe(true);
    });

    it('should reject quiz config without winnerLimit', () => {
      const config = {
        title: 'Test Quiz',
        description: 'Test',
        questions: [{
          id: 'q1',
          text: 'Test?',
          options: ['A', 'B'],
          correctIndex: 0,
        }],
        rewardToken: '0x' + '1'.repeat(40),
        rewardAmount: '1000',
        timePerQuestion: 15,
        nftEnabled: false,
      };
      
      const result = validateQuizConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Winner limit is required'))).toBe(true);
    });

    it('should reject invalid token address format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (invalidAddress) => {
            // Skip if accidentally valid
            if (/^0x[a-fA-F0-9]{40}$/.test(invalidAddress)) return true;
            
            const config = {
              title: 'Test Quiz',
              description: 'Test',
              questions: [{
                id: 'q1',
                text: 'Test?',
                options: ['A', 'B'],
                correctIndex: 0,
              }],
              rewardToken: invalidAddress,
              rewardAmount: '1000',
              winnerLimit: 10,
              timePerQuestion: 15,
              nftEnabled: false,
            };
            
            const result = validateQuizConfig(config);
            return result.isValid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Token Address Validation', () => {
  it('should accept valid ERC-20 addresses', () => {
    fc.assert(
      fc.property(
        hexAddress,
        (address) => isValidTokenAddress(address) === true
      ),
      { numRuns: 100 }
    );
  });

  it('should reject addresses without 0x prefix', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 15 }).map(n => n.toString(16)),
          { minLength: 40, maxLength: 40 }
        ).map(arr => arr.join('')),
        (address) => isValidTokenAddress(address) === false
      ),
      { numRuns: 100 }
    );
  });

  it('should reject addresses with wrong length', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.array(
            fc.integer({ min: 0, max: 15 }).map(n => n.toString(16)),
            { minLength: 1, maxLength: 39 }
          ).map(arr => `0x${arr.join('')}`),
          fc.array(
            fc.integer({ min: 0, max: 15 }).map(n => n.toString(16)),
            { minLength: 41, maxLength: 60 }
          ).map(arr => `0x${arr.join('')}`)
        ),
        (address) => isValidTokenAddress(address) === false
      ),
      { numRuns: 100 }
    );
  });
});
