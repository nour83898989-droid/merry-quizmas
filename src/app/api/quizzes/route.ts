/**
 * GET /api/quizzes - List active quizzes
 * POST /api/quizzes - Create new quiz
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { validateQuizConfig } from '@/lib/quiz/validation';
import { serializeQuestions } from '@/lib/quiz/serialization';
import { getTokenDisplayName } from '@/lib/web3/config';
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
  stakeRequired: { token: string; amount: number } | null;
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
  // Fun quiz and image fields
  isFunQuiz: boolean;
  coverImageUrl: string | null;
  // Creator info
  creatorUsername: string | null;
  createdAt: string | null;
}

/**
 * GET /api/quizzes
 * Returns list of active quizzes without correct answers
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Query active quizzes
    // - Reward quizzes: must have deposit_tx_hash (funded on blockchain)
    // - Fun quizzes: is_fun_quiz = true (no blockchain required)
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('status', 'active')
      .or('deposit_tx_hash.not.is.null,is_fun_quiz.eq.true')
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
      const isFunQuiz = quiz.is_fun_quiz === true;
      const remainingSpots = isFunQuiz ? 0 : (quiz.winner_limit - (quiz.current_winners || 0));
      const rewardPerWinner = !isFunQuiz && quiz.winner_limit > 0 
        ? (BigInt(quiz.reward_amount) / BigInt(quiz.winner_limit)).toString()
        : '0';
      
      // Parse reward pools
      const rewardPools = isFunQuiz ? [] : ((quiz.reward_pools as {
        tier: number;
        name: string;
        winnerCount: number;
        percentage: number;
      }[]) || [
        { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
        { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
      ]);

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionCount,
        rewardToken: isFunQuiz ? '' : getTokenDisplayName(quiz.reward_token),
        rewardPerWinner,
        remainingSpots,
        timePerQuestion: quiz.time_per_question,
        endsAt: quiz.end_time,
        stakeRequired: !isFunQuiz && quiz.stake_token && quiz.stake_amount
          ? { token: getTokenDisplayName(quiz.stake_token), amount: quiz.stake_amount }
          : null,
        rewardPools,
        totalPoolAmount: isFunQuiz ? '0' : String(quiz.total_pool_amount ?? quiz.reward_amount),
        entryFee: isFunQuiz ? null : (quiz.entry_fee || null),
        entryFeeToken: isFunQuiz ? null : (quiz.entry_fee_token ? getTokenDisplayName(quiz.entry_fee_token) : null),
        isFunQuiz,
        coverImageUrl: quiz.cover_image_url || null,
        creatorUsername: quiz.creator_username || null,
        createdAt: quiz.created_at,
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
    imageUrl?: string | null;
  }[];
  rewardToken: string | null;
  rewardAmount: string;
  winnerLimit: number;
  timePerQuestion?: number;
  // Support both field names for compatibility
  startTime?: string;
  startsAt?: string;
  endTime?: string;
  endsAt?: string;
  stakeToken?: string;
  stakeAmount?: string;
  // Support stakeRequired object from frontend
  stakeRequired?: { token: string; amount: string } | null;
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
  // Fun quiz and image fields
  isFunQuiz?: boolean;
  coverImageUrl?: string | null;
  // Creator info
  creatorFid?: number;
  creatorUsername?: string;
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

    // Normalize field names (support both startsAt/endsAt and startTime/endTime)
    // Convert empty strings to null
    const startTime = (body.startTime || body.startsAt || '').trim() || null;
    const endTime = (body.endTime || body.endsAt || '').trim() || null;
    
    // Normalize stake fields (support both stakeToken/stakeAmount and stakeRequired object)
    const stakeToken = body.stakeToken || body.stakeRequired?.token || null;
    const stakeAmount = body.stakeAmount || body.stakeRequired?.amount || null;

    // Generate IDs for questions (include imageUrl if provided)
    const questionsWithIds: Question[] = body.questions.map((q, index) => ({
      id: `q${index + 1}-${Date.now()}`,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      ...(q.imageUrl && { imageUrl: q.imageUrl }),
    }));

    // For fun quiz, skip reward validation
    const isFunQuiz = body.isFunQuiz === true;
    
    // Validate quiz config (skip reward validation for fun quiz)
    if (!isFunQuiz) {
      console.log('[POST /api/quizzes] Validating with:', {
        startTime,
        endTime,
        rewardAmount: body.rewardAmount,
      });
      const validationResult = validateQuizConfig({
        title: body.title,
        description: body.description || '',
        questions: questionsWithIds,
        rewardToken: body.rewardToken || '',
        rewardAmount: body.rewardAmount,
        winnerLimit: body.winnerLimit,
        timePerQuestion: body.timePerQuestion || 15,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        stakeRequirement: stakeToken && stakeAmount
          ? { token: stakeToken, amount: stakeAmount }
          : undefined,
        nftEnabled: body.nftEnabled || false,
        nftArtworkUrl: body.nftArtworkUrl,
      });

      if (!validationResult.isValid) {
        console.error('[POST /api/quizzes] Validation failed:', {
          errors: validationResult.errors,
          receivedData: {
            title: body.title,
            rewardToken: body.rewardToken,
            rewardAmount: body.rewardAmount,
            winnerLimit: body.winnerLimit,
            questionsCount: body.questions?.length,
          }
        });
        return NextResponse.json(
          { error: 'INVALID_CONFIG', details: validationResult.errors, message: validationResult.errors.join(', ') },
          { status: 400 }
        );
      }
    } else {
      // Basic validation for fun quiz
      if (!body.title || body.title.trim().length < 3) {
        return NextResponse.json(
          { error: 'INVALID_CONFIG', details: ['Title must be at least 3 characters'], message: 'Title must be at least 3 characters' },
          { status: 400 }
        );
      }
      if (!body.questions || body.questions.length < 1) {
        return NextResponse.json(
          { error: 'INVALID_CONFIG', details: ['At least one question is required'], message: 'At least one question is required' },
          { status: 400 }
        );
      }
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
        // For fun quiz, use empty string for reward_token (required field in DB)
        reward_token: isFunQuiz ? '' : (body.rewardToken || ''),
        reward_amount: isFunQuiz ? 0 : (parseInt(body.rewardAmount) || 0),
        winner_limit: isFunQuiz ? 0 : body.winnerLimit,
        time_per_question: body.timePerQuestion || 15,
        start_time: startTime,
        end_time: endTime,
        stake_token: isFunQuiz ? null : (stakeToken || null),
        stake_amount: isFunQuiz ? null : (stakeAmount ? parseInt(stakeAmount) : null),
        nft_enabled: body.nftEnabled || false,
        nft_artwork_url: body.nftArtworkUrl || null,
        status: 'active', // Quiz is active immediately after creation
        // New reward pool fields
        use_custom_pools: isFunQuiz ? false : (body.useCustomPools || false),
        reward_pools: isFunQuiz ? null : (body.rewardPools || [
          { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
          { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
        ]),
        entry_fee: isFunQuiz ? null : (body.entryFee || null),
        entry_fee_token: isFunQuiz ? null : (body.entryFeeToken || null),
        total_pool_amount: isFunQuiz ? 0 : (parseInt(body.rewardAmount) || 0),
        // Contract fields (null for fun quiz)
        contract_quiz_id: isFunQuiz ? null : (body.contractQuizId || null),
        deposit_tx_hash: isFunQuiz ? null : (body.depositTxHash || null),
        // Fun quiz and image fields (these columns may not exist yet - migration needed)
        is_fun_quiz: isFunQuiz,
        cover_image_url: body.coverImageUrl || null,
        // Creator info
        creator_fid: body.creatorFid || null,
        creator_username: body.creatorUsername || null,
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
