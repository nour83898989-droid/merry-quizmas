'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TimerBar } from '@/components/quiz/timer-bar';
import { AnswerOption } from '@/components/quiz/answer-option';
import { ProgressIndicator } from '@/components/quiz/progress-indicator';
import { ResultScreen } from '@/components/quiz/result-screen';

interface Question {
  id: string;
  text: string;
  options: string[];
}

interface SessionData {
  sessionId: string;
  quizId: string;
  quizTitle: string;
  questions: Question[];
  timePerQuestion: number;
  rewardPerWinner: string;
  rewardToken: string;
}

type GameState = 'countdown' | 'playing' | 'feedback' | 'result';

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
}

interface FinalResult {
  isWinner: boolean;
  score: number;
  totalQuestions: number;
  completionTimeMs: number;
  rank?: number;
  rewardAmount?: string;
}

export default function QuizPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<SessionData | null>(null);
  const [gameState, setGameState] = useState<GameState>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    // Session should already be created from quiz detail page
    // This is a fallback that shouldn't normally be called
    setError('Session not found. Please start the quiz from the quiz detail page.');
  }, []);

  // Fetch session data
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    // Session data should be passed from the start endpoint
    // For now, we'll simulate it with localStorage or refetch
    const storedSession = sessionStorage.getItem(`quiz-session-${sessionId}`);
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    } else {
      // Fallback: fetch from API
      fetchSession();
    }
  }, [sessionId, fetchSession]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'countdown' || !session) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setGameState('playing');
      setStartTime(Date.now());
    }
  }, [countdown, gameState, session]);

  // Handle answer submission
  const submitAnswer = useCallback(async () => {
    if (!session || selectedAnswer === null || isSubmitting) return;

    const currentQuestion = session.questions[currentQuestionIndex];
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/attempts/${sessionId}/answer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': sessionStorage.getItem('wallet-address') || '',
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedIndex: selectedAnswer,
          clientTimestamp: Date.now(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit answer');
      }
      
      const data = await res.json();
      
      setAnswerResult({
        correct: data.correct,
        correctIndex: data.correct ? selectedAnswer : -1, // API doesn't return correctIndex for security
      });
      
      if (data.correct) {
        setScore(prev => prev + 1);
      }

      setGameState('feedback');

      // Show feedback for 1.5 seconds then move to next question or result
      setTimeout(() => {
        if (data.isComplete) {
          // Quiz complete
          setFinalResult({
            isWinner: data.result?.isWinner || false,
            score: data.result?.score || score + (data.correct ? 1 : 0),
            totalQuestions: session.questions.length,
            completionTimeMs: data.result?.completionTimeMs || (Date.now() - startTime),
            rewardAmount: data.result?.rewardAmount,
            rank: data.result?.rank,
          });
          setGameState('result');
        } else if (currentQuestionIndex < session.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setAnswerResult(null);
          setGameState('playing');
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, sessionId, selectedAnswer, currentQuestionIndex, isSubmitting, score, startTime]);

  // Handle timeout
  const handleTimeout = useCallback(() => {
    if (gameState !== 'playing') return;
    
    // Auto-submit with no answer (wrong)
    setAnswerResult({ correct: false, correctIndex: -1 });
    setGameState('feedback');

    setTimeout(() => {
      if (session && currentQuestionIndex < session.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setAnswerResult(null);
        setGameState('playing');
      } else if (session) {
        const completionTime = Date.now() - startTime;
        setFinalResult({
          isWinner: false,
          score,
          totalQuestions: session.questions.length,
          completionTimeMs: completionTime,
        });
        setGameState('result');
      }
    }, 1500);
  }, [gameState, session, currentQuestionIndex, score, startTime]);

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <Button onClick={() => router.push('/quizzes')}>Back to Quizzes</Button>
        </div>
      </main>
    );
  }

  // Loading state
  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Loading quiz...</div>
      </main>
    );
  }

  // Countdown screen
  if (gameState === 'countdown') {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold text-foreground mb-8">{session.quizTitle}</h2>
        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-6xl font-bold text-primary animate-pulse">
            {countdown}
          </span>
        </div>
        <p className="text-foreground-muted mt-8">Get ready!</p>
      </main>
    );
  }

  // Result screen
  if (gameState === 'result' && finalResult) {
    return (
      <ResultScreen
        isWinner={finalResult.isWinner}
        score={finalResult.score}
        totalQuestions={finalResult.totalQuestions}
        completionTimeMs={finalResult.completionTimeMs}
        rewardAmount={finalResult.rewardAmount}
        rewardToken={session.rewardToken}
        rank={finalResult.rank}
        onShare={() => {
          // TODO: Implement share functionality
        }}
        onViewLeaderboard={() => router.push(`/quiz/${id}/leaderboard`)}
        onPlayAgain={() => router.push('/quizzes')}
      />
    );
  }

  // Playing/Feedback state
  const currentQuestion = session.questions[currentQuestionIndex];

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-foreground/10">
        <ProgressIndicator
          current={currentQuestionIndex + 1}
          total={session.questions.length}
        />
      </header>

      {/* Timer */}
      <div className="px-4 py-3">
        <TimerBar
          key={currentQuestionIndex}
          duration={session.timePerQuestion}
          onTimeout={handleTimeout}
          isPaused={gameState === 'feedback'}
        />
      </div>

      {/* Question */}
      <div className="flex-1 p-4">
        <h2 className="text-xl font-semibold text-foreground mb-6">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <AnswerOption
              key={index}
              index={index}
              text={option}
              isSelected={selectedAnswer === index}
              isCorrect={answerResult?.correctIndex === index}
              isRevealed={gameState === 'feedback'}
              disabled={gameState === 'feedback' || isSubmitting}
              onSelect={() => setSelectedAnswer(index)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-foreground/10">
        <Button
          onClick={submitAnswer}
          fullWidth
          disabled={selectedAnswer === null || gameState === 'feedback' || isSubmitting}
          isLoading={isSubmitting}
        >
          {gameState === 'feedback' 
            ? (answerResult?.correct ? 'Correct!' : 'Wrong!') 
            : 'Submit Answer'
          }
        </Button>
      </div>
    </main>
  );
}
