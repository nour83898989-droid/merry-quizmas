/**
 * Quiz Types
 * Core type definitions for quiz data structures
 */

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  [key: string]: string | string[] | number; // Index signature for JSON compatibility
}

export interface QuestionWithoutAnswer {
  id: string;
  text: string;
  options: string[];
}

export interface QuizConfig {
  title: string;
  description: string;
  questions: Question[];
  rewardToken: string;
  rewardAmount: string;
  winnerLimit: number;
  timePerQuestion: number;
  startTime?: string;
  endTime?: string;
  stakeRequirement?: {
    token: string;
    amount: string;
  };
  nftEnabled: boolean;
  nftArtworkUrl?: string;
}

export interface Quiz extends QuizConfig {
  id: string;
  creatorWallet: string;
  creatorFid?: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  currentWinners: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionsJson {
  questions: Question[];
  version: number;
  [key: string]: Question[] | number; // Index signature for JSON compatibility
}

export interface Answer {
  questionId: string;
  selectedIndex: number;
  timestamp: number;
  serverTimestamp: number;
  [key: string]: string | number; // Index signature for JSON compatibility
}

export interface AnswersJson {
  answers: Answer[];
  [key: string]: Answer[]; // Index signature for JSON compatibility
}

export interface QuizSession {
  id: string;
  quizId: string;
  walletAddress: string;
  startTime: string;
  currentQuestion: number;
  answers: Answer[];
  status: 'active' | 'completed' | 'failed' | 'timeout';
}

export interface SessionResult {
  sessionId: string;
  score: number;
  totalQuestions: number;
  completionTimeMs: number;
  isWinner: boolean;
  rewardAmount?: string;
  rank?: number;
}
