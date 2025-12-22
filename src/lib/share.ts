// Share functionality for Farcaster and other platforms

interface ShareQuizOptions {
  quizId: string;
  quizTitle: string;
  score?: number;
  totalQuestions?: number;
  isWinner?: boolean;
  rewardAmount?: string;
  rewardToken?: string;
}

export async function shareQuiz(options: ShareQuizOptions): Promise<void> {
  const { quizId, quizTitle, score, totalQuestions, isWinner, rewardAmount, rewardToken } = options;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://merry-quizmas.vercel.app';
  const quizUrl = `${baseUrl}/quiz/${quizId}`;

  let text: string;
  
  if (score !== undefined && totalQuestions !== undefined) {
    // Sharing result
    if (isWinner && rewardAmount) {
      // Winner with reward - tag creators
      const tokenName = rewardToken || 'tokens';
      text = `🏆 I just won ${rewardAmount} ${tokenName} playing "${quizTitle}"!\n\nCome play with me on Merry Quizmas by @ukhy89 & @papusiek1111 🎄`;
    } else if (isWinner) {
      text = `🏆 I won "${quizTitle}" quiz with a perfect score!\n\nCome play with me on Merry Quizmas by @ukhy89 & @papusiek1111 🎄`;
    } else {
      text = `I scored ${score}/${totalQuestions} on "${quizTitle}".\n\nThink you can do better? Play on Merry Quizmas by @ukhy89 & @papusiek1111 🎄`;
    }
  } else {
    // Sharing quiz invite
    text = `🎄 Check out this quiz: "${quizTitle}"\n\nPlay and win rewards on Merry Quizmas by @ukhy89 & @papusiek1111!`;
  }

  // Try Farcaster SDK first (only in MiniApp)
  if (typeof window !== 'undefined') {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      // Check if we're in a Farcaster mini app
      const context = await sdk.context;
      if (context) {
        // Use Farcaster's composeCast action - opens compose with pre-filled text
        await sdk.actions.composeCast({
          text,
          embeds: [quizUrl],
        });
        return;
      }
    } catch {
      // Not in Farcaster, fall through to web share
      console.log('[Share] Not in Farcaster MiniApp, using web share');
    }

    // Try Web Share API (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: quizTitle,
          text,
          url: quizUrl,
        });
        return;
      } catch (e) {
        // User cancelled or share failed
        console.log('[Share] Web Share cancelled or failed:', e);
      }
    }

    // Fallback: Open Warpcast compose in new tab
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(quizUrl)}`;
    window.open(warpcastUrl, '_blank');
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
