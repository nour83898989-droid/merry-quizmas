'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { ChristmasTree, Gift, Santa, Stocking, CandyCane } from '@/components/christmas/decorations';
import Link from 'next/link';

export default function HomePage() {
  return (
    <ChristmasLayout>
      <main className="min-h-screen relative">
        {/* Main Content */}
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
                Play holiday quizzes and win crypto rewards this Christmas season!
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link href="/quizzes">
                  <Button className="christmas-gradient text-white">
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Play Now
                  </Button>
                </Link>
                <Link href="/polls">
                  <Button variant="outline" className="border-primary/50">
                    <PollIcon className="w-4 h-4 mr-2" />
                    Polls
                  </Button>
                </Link>
                <Link href="/claim">
                  <Button variant="outline" className="border-primary/50">
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Gifts
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Gift className="w-8 h-8" />} label="Rewards" value="$10K+" />
            <StatCard icon={<ChristmasTree className="w-8 h-8" />} label="Quizzes" value="50+" />
            <StatCard icon={<Stocking className="w-8 h-8" />} label="Winners" value="1K+" />
          </div>

          {/* Create Quiz Panel */}
          <Card variant="interactive" className="christmas-card relative overflow-hidden gift-ribbon">
            <div className="absolute top-2 right-2 opacity-20">
              <CandyCane className="w-12 h-12" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Gift className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Create Quiz</h2>
                  <p className="text-sm text-foreground-muted">Share the holiday spirit</p>
                </div>
              </div>
              <CardContent className="p-0">
                <p className="text-sm text-foreground-muted mb-4">
                  Create festive quizzes with rewards. Perfect for holiday parties and gatherings!
                </p>
                <Link href="/create">
                  <Button variant="secondary" fullWidth>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Holiday Quiz
                  </Button>
                </Link>
              </CardContent>
            </div>
          </Card>

          {/* Join Quiz Panel */}
          <Card variant="interactive" className="christmas-card relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 text-xs font-medium bg-success/20 text-success rounded-full animate-pulse">
                🔥 Hot
              </span>
            </div>
            <div className="absolute bottom-2 right-2 opacity-20">
              <Stocking className="w-10 h-10" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <ChristmasTree className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Join Quiz</h2>
                  <p className="text-sm text-foreground-muted">Win holiday rewards</p>
                </div>
              </div>
              <CardContent className="p-0">
                <p className="text-sm text-foreground-muted mb-4">
                  Browse Christmas quizzes and compete for rewards. Answer correctly to win!
                </p>
                <Link href="/quizzes">
                  <Button variant="outline" fullWidth>
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Browse Quizzes
                  </Button>
                </Link>
              </CardContent>
            </div>
          </Card>

          {/* Polls Panel */}
          <Card variant="interactive" className="christmas-card relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
                🆕 New
              </span>
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Polls</h2>
                  <p className="text-sm text-foreground-muted">Vote & validate</p>
                </div>
              </div>
              <CardContent className="p-0">
                <p className="text-sm text-foreground-muted mb-4">
                  Create polls and let the community vote! Perfect for decisions and validations.
                </p>
                <Link href="/polls">
                  <Button variant="outline" fullWidth>
                    <PollIcon className="w-4 h-4 mr-2" />
                    Browse Polls
                  </Button>
                </Link>
              </CardContent>
            </div>
          </Card>

          {/* How it works */}
          <OnboardingSection />

          {/* Footer */}
          <div className="text-center py-4">
            <div className="flex justify-center gap-2 mb-2">
              <ChristmasTree className="w-6 h-6" />
              <Santa className="w-6 h-6" />
              <Gift className="w-6 h-6" />
              <Stocking className="w-6 h-6" />
              <CandyCane className="w-6 h-6" />
            </div>
            <p className="text-xs text-foreground-muted">
              🎄 Happy Holidays from Merry Quizmas Team 🎄
            </p>
          </div>
        </div>
      </main>
    </ChristmasLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="christmas-card text-center py-3">
      <div className="flex justify-center mb-1 opacity-70">{icon}</div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-foreground-muted">{label}</p>
    </Card>
  );
}

function OnboardingSection() {
  return (
    <Card className="christmas-card">
      <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span>⭐</span> How it works
      </h3>
      <div className="space-y-3">
        <OnboardingStep 
          emoji="🔗"
          title="Connect Wallet" 
          description="Sign in with MetaMask or any wallet"
        />
        <OnboardingStep 
          emoji="🎮"
          title="Join or Create" 
          description="Browse quizzes or create your own"
        />
        <OnboardingStep 
          emoji="⏱️"
          title="Answer Questions" 
          description="Answer correctly within time limit"
        />
        <OnboardingStep 
          emoji="🎁"
          title="Win Rewards" 
          description="Claim your crypto rewards instantly"
        />
      </div>
    </Card>
  );
}

function OnboardingStep({ 
  emoji,
  title, 
  description 
}: { 
  emoji: string;
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full christmas-gradient flex items-center justify-center flex-shrink-0">
        <span className="text-sm">{emoji}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
      </div>
    </div>
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
