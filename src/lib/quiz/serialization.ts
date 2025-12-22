/**
 * Quiz Serialization
 * Functions for serializing and deserializing quiz data to/from JSON
 */

import type { Quiz, Question, QuestionsJson } from './types';

/**
 * Serialize a Quiz object to JSON string
 */
export function serializeQuiz(quiz: Quiz): string {
  return JSON.stringify(quiz);
}

/**
 * Deserialize a JSON string to Quiz object
 */
export function deserializeQuiz(json: string): Quiz {
  const parsed = JSON.parse(json);
  return {
    id: parsed.id,
    creatorWallet: parsed.creatorWallet,
    creatorFid: parsed.creatorFid,
    title: parsed.title,
    description: parsed.description,
    questions: parsed.questions,
    rewardToken: parsed.rewardToken,
    rewardAmount: parsed.rewardAmount,
    winnerLimit: parsed.winnerLimit,
    timePerQuestion: parsed.timePerQuestion,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    stakeRequirement: parsed.stakeRequirement,
    nftEnabled: parsed.nftEnabled,
    nftArtworkUrl: parsed.nftArtworkUrl,
    status: parsed.status,
    currentWinners: parsed.currentWinners,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}

/**
 * Serialize questions to QuestionsJson format for database storage
 */
export function serializeQuestions(questions: Question[]): QuestionsJson {
  return {
    questions,
    version: 1,
  };
}

/**
 * Deserialize QuestionsJson from database
 */
export function deserializeQuestions(json: QuestionsJson): Question[] {
  return json.questions;
}

/**
 * Check if two Quiz objects are equivalent
 */
export function quizzesAreEqual(a: Quiz, b: Quiz): boolean {
  return (
    a.id === b.id &&
    a.creatorWallet === b.creatorWallet &&
    a.creatorFid === b.creatorFid &&
    a.title === b.title &&
    a.description === b.description &&
    a.rewardToken === b.rewardToken &&
    a.rewardAmount === b.rewardAmount &&
    a.winnerLimit === b.winnerLimit &&
    a.timePerQuestion === b.timePerQuestion &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.nftEnabled === b.nftEnabled &&
    a.nftArtworkUrl === b.nftArtworkUrl &&
    a.status === b.status &&
    a.currentWinners === b.currentWinners &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt &&
    questionsAreEqual(a.questions, b.questions) &&
    stakeRequirementsAreEqual(a.stakeRequirement, b.stakeRequirement)
  );
}

function questionsAreEqual(a: Question[], b: Question[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((q, i) => 
    q.id === b[i].id &&
    q.text === b[i].text &&
    q.correctIndex === b[i].correctIndex &&
    q.options.length === b[i].options.length &&
    q.options.every((opt, j) => opt === b[i].options[j])
  );
}

function stakeRequirementsAreEqual(
  a: { token: string; amount: string } | undefined,
  b: { token: string; amount: string } | undefined
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return a.token === b.token && a.amount === b.amount;
}
