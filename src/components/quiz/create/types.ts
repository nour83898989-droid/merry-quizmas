/**
 * Types for Quiz Creation
 */

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface RewardPool {
  tier: number;
  name: string;
  winnerCount: number;
  percentage: number;
}

export interface QuizForm {
  title: string;
  description: string;
  questions: Question[];
  rewardToken: string;
  rewardAmount: string;
  winnerLimit: number;
  timePerQuestion: number;
  startsAt: string;
  endsAt: string;
  stakeToken: string;
  stakeAmount: string;
  useCustomPools: boolean;
  rewardPools: RewardPool[];
  entryFee: string;
  entryFeeToken: string;
}

export const DEFAULT_POOLS: RewardPool[] = [
  { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
  { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
];

export const STEPS = ['Basic Info', 'Questions', 'Rewards', 'Settings', 'Preview'];
