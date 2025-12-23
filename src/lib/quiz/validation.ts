/**
 * Quiz Validation
 * Validation functions for quiz configuration and questions
 */

import type { Question, QuizConfig } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate a single question
 * - Must have 2-6 options
 * - Must have exactly one correct answer (correctIndex within bounds)
 */
export function validateQuestion(question: Partial<Question>): ValidationResult {
  const errors: string[] = [];

  // Check question text
  if (!question.text || question.text.trim().length === 0) {
    errors.push('Question text is required');
  }

  // Check options count (2-6)
  if (!question.options || !Array.isArray(question.options)) {
    errors.push('Question must have options array');
  } else {
    if (question.options.length < 2) {
      errors.push('Question must have at least 2 options');
    }
    if (question.options.length > 6) {
      errors.push('Question must have at most 6 options');
    }

    // Check for empty options
    const emptyOptions = question.options.filter(opt => !opt || opt.trim().length === 0);
    if (emptyOptions.length > 0) {
      errors.push('All options must have non-empty text');
    }
  }

  // Check correct answer index
  if (question.correctIndex === undefined || question.correctIndex === null) {
    errors.push('Correct answer index is required');
  } else if (question.options) {
    if (question.correctIndex < 0) {
      errors.push('Correct answer index must be non-negative');
    }
    if (question.correctIndex >= question.options.length) {
      errors.push('Correct answer index must be within options range');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if option count is valid (2-6)
 */
export function isValidOptionCount(count: number): boolean {
  return count >= 2 && count <= 6;
}

/**
 * Check if correct index is valid for given options
 */
export function isValidCorrectIndex(correctIndex: number, optionsLength: number): boolean {
  return correctIndex >= 0 && correctIndex < optionsLength;
}

/**
 * Validate ERC-20 token address format
 */
export function isValidTokenAddress(address: string): boolean {
  if (!address) return false;
  // Check for 0x prefix and 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate quiz configuration
 * - Title is required
 * - At least one question
 * - All questions are valid
 * - Reward token is valid address
 * - Reward amount is positive
 * - Winner limit is positive
 */
export function validateQuizConfig(config: Partial<QuizConfig>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!config.title || config.title.trim().length === 0) {
    errors.push('Quiz title is required');
  } else if (config.title.length > 100) {
    errors.push('Quiz title must be 100 characters or less');
  }

  // Questions validation
  if (!config.questions || !Array.isArray(config.questions)) {
    errors.push('Quiz must have questions array');
  } else if (config.questions.length === 0) {
    errors.push('Quiz must have at least one question');
  } else {
    // Validate each question
    config.questions.forEach((question, index) => {
      const questionResult = validateQuestion(question);
      if (!questionResult.isValid) {
        questionResult.errors.forEach(err => {
          errors.push(`Question ${index + 1}: ${err}`);
        });
      }
    });
  }

  // Reward token validation
  if (!config.rewardToken) {
    errors.push('Reward token address is required');
  } else if (!isValidTokenAddress(config.rewardToken)) {
    errors.push('Reward token must be a valid ERC-20 address');
  }

  // Reward amount validation
  if (!config.rewardAmount) {
    errors.push('Reward amount is required');
  } else {
    try {
      // Handle both integer and decimal strings
      const amountStr = String(config.rewardAmount);
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        errors.push('Reward amount must be positive');
      }
    } catch {
      errors.push('Reward amount must be a valid number');
    }
  }

  // Winner limit validation
  if (config.winnerLimit === undefined || config.winnerLimit === null) {
    errors.push('Winner limit is required');
  } else if (config.winnerLimit < 1) {
    errors.push('Winner limit must be at least 1');
  } else if (config.winnerLimit > 10000) {
    errors.push('Winner limit must be 10000 or less');
  }

  // Time per question validation
  if (config.timePerQuestion !== undefined) {
    if (config.timePerQuestion < 5) {
      errors.push('Time per question must be at least 5 seconds');
    } else if (config.timePerQuestion > 300) {
      errors.push('Time per question must be 300 seconds or less');
    }
  }

  // Stake requirement validation (optional)
  if (config.stakeRequirement) {
    if (!isValidTokenAddress(config.stakeRequirement.token)) {
      errors.push('Stake token must be a valid ERC-20 address');
    }
    try {
      const amount = BigInt(config.stakeRequirement.amount);
      if (amount < 0n) {
        errors.push('Stake amount must be non-negative');
      }
    } catch {
      errors.push('Stake amount must be a valid number');
    }
  }

  // Date validation (optional) - only validate if both are non-empty strings
  if (config.startTime && config.startTime.trim() && config.endTime && config.endTime.trim()) {
    const start = new Date(config.startTime);
    const end = new Date(config.endTime);
    // Only validate if both dates are valid
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (end <= start) {
        errors.push('End time must be after start time');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
