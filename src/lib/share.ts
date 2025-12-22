// Share functionality for Farcaster and other platforms

interface ShareQuizOptions {
  quizId: string;
  quizTitle: string;
  score?: number;
  totalQuestions?: number;
  isWinner?: boolean;
}

export async function shareQuiz(options: ShareQuizOptions): Promise<void> {
  const { quizId, quizTitle, score, totalQuestions, isWinner } = options;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-app.vercel.app';
  const quizUrl = `${baseUrl}/quiz/${quizId}`;

  let text: string;
  
  if (score !== undefined && totalQuestions !== undefined) {
    // Sharing result
    if (isWinner) {
      text = `🏆 I won the "${quizTitle}" quiz with a perfect score! Can you beat my time?`;
    } else {
      text = `I scored ${score}/${totalQuestions} on "${quizTitle}". Think you can do better?`;
    }
  } else {
    // Sharing quiz invite
    text = `Check out this quiz: "${quizTitle}" - Play and win rewards!`;
  }

  // Try Farcaster SDK first
  if (typeof window !== 'undefined') {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      // Check if we're in a Farcaster mini app
      const context = await sdk.context;
      if (context) {
        // Use Farcaster's composeCast
        await sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(quizUrl)}`);
        return;
      }
    } catch {
      // Not in Farcaster, fall through to web share
    }

    // Try Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: quizTitle,
          text,
          url: quizUrl,
        });
        return;
      } catch {
        // User cancelled or share failed
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${text}\n${quizUrl}`);
      // Could show a toast here
    } catch {
      // Clipboard failed, open in new tab
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(quizUrl)}`, '_blank');
    }
  }
}

export function generateEmbedUrl(quizId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-app.vercel.app';
  return `${baseUrl}/quiz/${quizId}`;
}

export function generateOgImageUrl(quizId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-app.vercel.app';
  return `${baseUrl}/api/quizzes/${quizId}/og-image`;
}
