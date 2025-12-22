import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Generate dynamic embed metadata for quiz sharing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('id, title, description, reward_amount, winner_limit, reward_token')
    .eq('id', id)
    .single();

  if (error || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const rewardPerWinner = quiz.winner_limit > 0 
    ? (parseFloat(quiz.reward_amount) / quiz.winner_limit).toFixed(2)
    : '0';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-app.vercel.app';

  // Return embed metadata for Farcaster frames
  const embedData = {
    version: 'vNext',
    imageUrl: `${baseUrl}/api/quizzes/${id}/og-image`,
    imageAspectRatio: '3:2',
    title: quiz.title,
    description: quiz.description || `Win ${rewardPerWinner} ${quiz.reward_token || 'tokens'}!`,
    button: {
      title: 'Play Quiz',
      action: {
        type: 'launch_frame',
        name: 'Quiz App',
        url: `${baseUrl}/quiz/${id}`,
        splashImageUrl: `${baseUrl}/splash.png`,
        splashBackgroundColor: '#0d0d0d',
      },
    },
  };

  return NextResponse.json(embedData);
}
