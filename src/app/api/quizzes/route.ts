/**
 * GET /api/quizzes - List active quizzes
 * POST /api/quizzes - Create new quiz
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { validateQuizConfig } from '@/lib/quiz/validation';
import { serializeQuestions } from '@/lib/quiz/serialization';
import type { Question } from '@/lib/quiz/types';
import type { Json } from '@/lib/supabase/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface QuizListItem {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  rewardToken: string;
  rewardPerWinner: string;
  remainingSpots: number;
  timePerQuestion: number;
  endsAt: string | null;
  stakeRequired: { token: string; amount: string } | null;
  // New reward pool fields
  rewardPools: {
    tier: number;
    name: string;
    winnerCount: number;
    percentage: number;
  }[];
  totalPoolAmount: string;
  entryFee: string | null;
  entryFeeToken: string | null;
}

/**
 * GET /api/quizzes
 * Returns list of active quizzes without correct answers
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Query active quizzes
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to fetch quizzes' },
        { status: 500 }
      );
    }

    // Transform to response format
    const quizList: QuizListItem[] = (quizzes || []).map(quiz => {
      const questionsJson = quiz.questions_json as unknown as { questions: Question[] };
      const questionCount = questionsJson?.questions?.length || 0;
      const remainingSpots = quiz.winner_limit - (quiz.current_winners || 0);
      const rewardPerWinner = quiz.winner_limit > 0 
        ? (BigInt(quiz.reward_amount) / BigInt(quiz.winner_limit)).toString()
        : '0';
      
      // Parse reward pools - use type assertion for new columns
      const quizData = quiz as typeof quiz & {
        reward_pools?: unknown;
        total_pool_amount?: string;
        entry_fee?: string;
        entry_fee_token?: string;
      };
      
      const rewardPools = (quizData.reward_pools as {
        tier: number;
        name: string;
        winnerCount: number;
        percentage: number;
      }[]) || [
        { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
        { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
      ];

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionCount,
        rewardToken: quiz.reward_token,
        rewardPerWinner,
        remainingSpots,
        timePerQuestion: quiz.time_per_question,
        endsAt: quiz.end_time,
        stakeRequired: quiz.stake_token && quiz.stake_amount
          ? { token: quiz.stake_token, amount: quiz.stake_amount }
          : null,
        rewardPools,
        totalPoolAmount: quizData.total_pool_amount?.toString() || quiz.reward_amount,
        entryFee: quizData.entry_fee || null,
        entryFeeToken: quizData.entry_fee_token || null,
      };
    });

    return NextResponse.json({ quizzes: quizList });
  } catch (error) {
    console.error('Unexpected error in GET /api/quizzes:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

interface CreateQuizRequest {
  title: string;
  description?: string;
  questions: {
    text: string;
    options: string[];
    correctIndex: number;
  }[];
  rewardToken: string;
  rewardAmount: string;
  winnerLimit: number;
  timePerQuestion?: number;
  startTime?: string;
  endTime?: string;
  stakeToken?: string;
  stakeAmount?: string;
  nftEnabled?: boolean;
  nftArtworkUrl?: string;
  // New reward pool fields
  useCustomPools?: boolean;
  rewardPools?: {
    tier: number;
    name: string;
    winnerCount: number;
    percentage: number;
  }[];
  entryFee?: string;
  entryFeeToken?: string;
  // Contract fields
  contractQuizId?: string;
  depositTxHash?: string;
}

/**
 * POST /api/quizzes
 * Creates a new quiz
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateQuizRequest = await request.json();
    
    // Get creator wallet from header (simplified - should use proper auth)
    const creatorWallet = request.headers.get('x-wallet-address');
    
    if (!creatorWallet) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Wallet address required' },
        { status: 401 }
      );
    }

    // Generate IDs for questions
    const questionsWithIds: Question[] = body.questions.map((q, index) => ({
      id: `q${index + 1}-${Date.now()}`,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
    }));

    // Validate quiz config
    const validationResult = validateQuizConfig({
      title: body.title,
      description: body.description || '',
      questions: questionsWithIds,
      rewardToken: body.rewardToken,
      rewardAmount: body.rewardAmount,
      winnerLimit: body.winnerLimit,
      timePerQuestion: body.timePerQuestion || 15,
      startTime: body.startTime,
      endTime: body.endTime,
      stakeRequirement: body.stakeToken && body.stakeAmount
        ? { token: body.stakeToken, amount: body.stakeAmount }
        : undefined,
      nftEnabled: body.nftEnabled || false,
      nftArtworkUrl: body.nftArtworkUrl,
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'INVALID_CONFIG', details: validationResult.errors },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create quiz in database
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        creator_wallet: creatorWallet,
        title: body.title,
        description: body.description || null,
        questions_json: serializeQuestions(questionsWithIds) as unknown as Json,
        reward_token: body.rewardToken,
        reward_amount: body.rewardAmount,
        winner_limit: body.winnerLimit,
        time_per_question: body.timePerQuestion || 15,
        start_time: body.startTime || null,
        end_time: body.endTime || null,
        stake_token: body.stakeToken || null,
        stake_amount: body.stakeAmount || null,
        nft_enabled: body.nftEnabled || false,
        nft_artwork_url: body.nftArtworkUrl || null,
        status: 'active', // Quiz is active immediately after creation
        // New reward pool fields
        use_custom_pools: body.useCustomPools || false,
        reward_pools: body.rewardPools || [
          { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
          { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
        ],
        entry_fee: body.entryFee || null,
        entry_fee_token: body.entryFeeToken || null,
        total_pool_amount: body.rewardAmount,
        // Contract fields
        contract_quiz_id: body.contractQuizId || null,
        deposit_tx_hash: body.depositTxHash || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quiz:', error);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to create quiz' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      quiz: {
        id: quiz.id,
        title: quiz.title,
        status: quiz.status,
        createdAt: quiz.created_at,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/quizzes:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
