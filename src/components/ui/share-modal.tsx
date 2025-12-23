'use client';

import { useState } from 'react';
import { Card } from './card';
import { Button } from './button';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  quizTitle: string;
  questionCount: number;
  isFunQuiz: boolean;
  winnerCount?: number;
}

export function ShareModal({ 
  isOpen, 
  onClose, 
  quizId, 
  quizTitle, 
  questionCount,
  isFunQuiz,
  winnerCount = 0
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!isOpen) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://merry-quizmas.vercel.app';
  const quizUrl = `${baseUrl}/quiz/${quizId}`;

  // Generate cast text based on quiz type
  const castText = isFunQuiz
    ? `🎯 Test your knowledge!\n\n"${quizTitle}"\n📝 ${questionCount} questions\n\nPlay now 👇`
    : `🎯 New Quiz Alert!\n\n"${quizTitle}"\n📝 ${questionCount} questions\n🏆 ${winnerCount} winners can earn rewards!\n\nJoin now 👇`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(quizUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[ShareModal] Copy failed:', err);
    }
  };

  const handleShareFarcaster = async () => {
    setSharing(true);
    try {
      // Try Farcaster SDK first (only in MiniApp)
      if (typeof window !== 'undefined') {
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          const context = await sdk.context;
          
          if (context) {
            // Use Farcaster's composeCast action
            await sdk.actions.composeCast({
              text: castText,
              embeds: [quizUrl],
            });
            return;
          }
        } catch {
          console.log('[ShareModal] Not in Farcaster MiniApp');
        }

        // Fallback: Open Warpcast compose
        const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(quizUrl)}`;
        window.open(warpcastUrl, '_blank');
      }
    } catch (err) {
      console.error('[ShareModal] Farcaster share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleShareTwitter = () => {
    const tweetText = isFunQuiz
      ? `🎯 Test your knowledge! "${quizTitle}" - ${questionCount} questions`
      : `🎯 New Quiz Alert! "${quizTitle}" - ${questionCount} questions, ${winnerCount} winners can earn rewards!`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(quizUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md bg-background border border-foreground/10 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <h2 className="text-lg font-semibold text-foreground">Quiz Published!</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-foreground-muted hover:text-foreground transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Quiz Info */}
        <div className="p-3 rounded-lg bg-surface/50 mb-4">
          <p className="font-medium text-foreground truncate">{quizTitle}</p>
          <p className="text-sm text-foreground-muted mt-1">
            {questionCount} questions {!isFunQuiz && `• ${winnerCount} winners`}
          </p>
          {isFunQuiz && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300">
              🎉 Fun Quiz
            </span>
          )}
        </div>

        {/* Share Options */}
        <div className="space-y-3">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface/80 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">Copy Link</p>
              <p className="text-xs text-foreground-muted truncate">{quizUrl}</p>
            </div>
            {copied && (
              <span className="text-xs text-success font-medium">Copied!</span>
            )}
          </button>

          {/* Share to Farcaster */}
          <button
            onClick={handleShareFarcaster}
            disabled={sharing}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <FarcasterIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">Share to Farcaster</p>
              <p className="text-xs text-foreground-muted">Post to your followers</p>
            </div>
          </button>

          {/* Share to Twitter */}
          <button
            onClick={handleShareTwitter}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <TwitterIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">Share to Twitter</p>
              <p className="text-xs text-foreground-muted">Tweet about your quiz</p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-foreground/10">
          <Button onClick={onClose} fullWidth variant="outline">
            View Quiz
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function FarcasterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.24 2.4H5.76C3.936 2.4 2.4 3.936 2.4 5.76v12.48c0 1.824 1.536 3.36 3.36 3.36h12.48c1.824 0 3.36-1.536 3.36-3.36V5.76c0-1.824-1.536-3.36-3.36-3.36zm-1.92 14.4h-2.4v-4.8c0-.96-.48-1.44-1.2-1.44-.72 0-1.2.48-1.2 1.44v4.8h-2.4v-4.8c0-.96-.48-1.44-1.2-1.44-.72 0-1.2.48-1.2 1.44v4.8H4.32V7.2h2.4v1.2c.48-.72 1.2-1.44 2.4-1.44 1.2 0 2.16.48 2.64 1.44.48-.96 1.44-1.44 2.64-1.44 1.68 0 2.88 1.2 2.88 3.12v6.72z"/>
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
