'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { ChristmasTree, Gift, Santa } from '@/components/christmas/decorations';
import Link from 'next/link';

export default function HomePage() {
  return (
    <ChristmasLayout>
      <main className="min-h-screen relative">
        <div className="relative z-10 p-4 space-y-4">
          {/* Hero Banner */}
          <div className="christmas-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 opacity-30">
              <ChristmasTree className="w-24 h-24" />
            </div>
            <div className="absolute bottom-2 right-16 opacity-20">
              <Gift className="w-16 h-16" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Santa className="w-12 h-12" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Merry Quizmas! 🎅
                  </h2>
                  <p className="text-sm text-primary">Ho Ho Ho!</p>
                </div>
              </div>
              <p className="text-foreground-muted mb-4">
                Play holiday quizzes and win crypto rewards!
              </p>
            </div>
          </div>

          {/* Join Quiz - Primary Action */}
          <Link href="/quizzes" className="block">
            <Card variant="interactive" className="christmas-card relative overflow-hidden">
              <div className="flex items-center gap-4 p-2">
                <div className="w-14 h-14 rounded-xl christmas-gradient flex items-center justify-center">
                  <PlayIcon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">Join Quiz</h2>
                  <p className="text-sm text-foreground-muted">Play & win rewards</p>
                </div>
                <ArrowIcon className="w-6 h-6 text-foreground-muted" />
              </div>
            </Card>
          </Link>

          {/* Create Quiz */}
          <Link href="/create" className="block">
            <Card variant="interactive" className="christmas-card relative overflow-hidden">
              <div className="flex items-center gap-4 p-2">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <PlusIcon className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">Create Quiz</h2>
                  <p className="text-sm text-foreground-muted">Host your own quiz</p>
                </div>
                <ArrowIcon className="w-6 h-6 text-foreground-muted" />
              </div>
            </Card>
          </Link>

          {/* Polls */}
          <Link href="/polls" className="block">
            <Card variant="interactive" className="christmas-card relative overflow-hidden">
              <div className="flex items-center gap-4 p-2">
                <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <PollIcon className="w-8 h-8 text-secondary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">Polls</h2>
                  <p className="text-sm text-foreground-muted">Vote & validate</p>
                </div>
                <ArrowIcon className="w-6 h-6 text-foreground-muted" />
              </div>
            </Card>
          </Link>

          {/* Footer */}
          <div className="text-center py-4">
            <p className="text-xs text-foreground-muted">
              🎄 Happy Holidays from Merry Quizmas Team 🎄
            </p>
          </div>
        </div>
      </main>
    </ChristmasLayout>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
