'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TokenSelector } from '@/components/ui/token-selector';
import { DatePicker } from '@/components/ui/date-picker';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { Gift } from '@/components/christmas/decorations';
import { SUPPORTED_TOKENS, IS_TESTNET, getTokenByAddress } from '@/lib/web3/config';
import { createQuizOnChain, waitForTransaction } from '@/lib/web3/transactions';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

interface RewardPool {
  tier: number;
  name: string;
  winnerCount: number;
  percentage: number; // percentage of total pool
}

interface QuizForm {
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
  // New reward pool fields
  useCustomPools: boolean;
  rewardPools: RewardPool[];
  entryFee: string;
  entryFeeToken: string;
}

// Default pools: 100 first (70%), 900 next (30%)
const DEFAULT_POOLS: RewardPool[] = [
  { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
  { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
];

const STEPS = ['Basic Info', 'Questions', 'Rewards', 'Settings', 'Preview'];

export default function CreateQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [form, setForm] = useState<QuizForm>({
    title: '',
    description: '',
    questions: [],
    rewardToken: SUPPORTED_TOKENS[0]?.address || '',
    rewardAmount: '',
    winnerLimit: 1000,
    timePerQuestion: 30,
    startsAt: '',
    endsAt: '',
    stakeToken: '',
    stakeAmount: '',
    // New reward pool fields
    useCustomPools: false,
    rewardPools: DEFAULT_POOLS,
    entryFee: '',
    entryFeeToken: '',
  });

  // Get wallet address from window.ethereum
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setWalletAddress(accs[0]);
        }
      });

      window.ethereum.on?.('accountsChanged', (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setWalletAddress(accs[0]);
        } else {
          setWalletAddress(null);
        }
      });
    }
  }, []);

  const updateForm = (updates: Partial<QuizForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return form.title.trim().length >= 3;
      case 1: return form.questions.length >= 1 && form.questions.every(q => 
        q.text.trim() && q.options.filter(o => o.trim()).length >= 2
      );
      case 2: return form.rewardToken.trim() && parseFloat(form.rewardAmount) > 0 && 
        (form.useCustomPools ? form.rewardPools.reduce((sum, p) => sum + p.percentage, 0) === 100 : true);
      case 3: return form.winnerLimit > 0 && form.timePerQuestion >= 10;
      case 4: return walletAddress !== null; // Must connect wallet to publish
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handlePublish = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Calculate total winners from pools
      const totalWinners = form.rewardPools.reduce((sum, p) => sum + p.winnerCount, 0);
      
      // Get token info for decimals
      const rewardToken = getTokenByAddress(form.rewardToken);
      const entryFeeToken = form.entryFeeToken ? getTokenByAddress(form.entryFeeToken) : null;
      const stakeToken = form.stakeToken ? getTokenByAddress(form.stakeToken) : null;

      if (!rewardToken) {
        alert('Invalid reward token selected');
        setIsSubmitting(false);
        return;
      }

      // Generate a unique quiz ID for the contract
      const quizIdForContract = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      // Step 1: Create quiz on blockchain (deposits reward tokens)
      const txResult = await createQuizOnChain(
        quizIdForContract,
        form.rewardToken,
        form.rewardAmount,
        rewardToken.decimals,
        form.entryFeeToken || '',
        form.entryFee || '0',
        entryFeeToken?.decimals || 18,
        form.stakeToken || '',
        form.stakeAmount || '0',
        stakeToken?.decimals || 18,
        walletAddress
      );

      if (!txResult.success) {
        alert(txResult.error || 'Failed to create quiz on blockchain');
        setIsSubmitting(false);
        return;
      }

      // Wait for transaction to be mined
      if (txResult.txHash) {
        const confirmed = await waitForTransaction(txResult.txHash);
        if (!confirmed) {
          alert('Transaction failed or timed out');
          setIsSubmitting(false);
          return;
        }
      }

      // Step 2: Save quiz to database with contract info
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          questions: form.questions.map(q => ({
            text: q.text,
            options: q.options.filter(o => o.trim()),
            correctIndex: q.correctIndex,
          })),
          rewardToken: form.rewardToken,
          rewardAmount: form.rewardAmount,
          winnerLimit: totalWinners,
          timePerQuestion: form.timePerQuestion,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          stakeRequired: form.stakeToken && form.stakeAmount ? {
            token: form.stakeToken,
            amount: form.stakeAmount,
          } : null,
          // New reward pool fields
          useCustomPools: form.useCustomPools,
          rewardPools: form.rewardPools,
          entryFee: form.entryFee || null,
          entryFeeToken: form.entryFeeToken || null,
          // Contract info
          contractQuizId: quizIdForContract,
          depositTxHash: txResult.txHash,
        }),
      });

      if (!res.ok) throw new Error('Failed to save quiz to database');
      const data = await res.json();
      router.push(`/quiz/${data.quiz.id}`);
    } catch (error) {
      console.error('Failed to publish quiz:', error);
      alert('Failed to publish quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ChristmasLayout>
      <main className="min-h-screen pb-24">
        {/* Progress Header */}
        <div className="px-4 py-4 border-b border-foreground/10 bg-background/50">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-6 h-6" />
            <h1 className="text-lg font-semibold text-foreground">Create Quiz</h1>
          </div>

          {/* Progress */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-foreground/10'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-foreground-muted mt-2">
            Step {step + 1}: {STEPS[step]}
          </p>
        </div>

      {/* Content */}
      <div className="p-4">
        {step === 0 && <BasicInfoStep form={form} updateForm={updateForm} />}
        {step === 1 && <QuestionsStep form={form} updateForm={updateForm} />}
        {step === 2 && <RewardsStep form={form} updateForm={updateForm} walletAddress={walletAddress} />}
        {step === 3 && <SettingsStep form={form} updateForm={updateForm} walletAddress={walletAddress} />}
        {step === 4 && <PreviewStep form={form} walletConnected={!!walletAddress} />}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-foreground/10">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handlePublish} 
              disabled={!canProceed() || isSubmitting}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Publish Quiz
            </Button>
          )}
        </div>
      </div>
    </main>
    </ChristmasLayout>
  );
}

function BasicInfoStep({ form, updateForm }: { form: QuizForm; updateForm: (u: Partial<QuizForm>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Quiz Title *
        </label>
        <Input
          value={form.title}
          onChange={e => updateForm({ title: e.target.value })}
          placeholder="Enter quiz title"
          maxLength={100}
        />
        <p className="text-xs text-foreground-muted mt-1">
          {form.title.length}/100 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Description (optional)
        </label>
        <textarea
          value={form.description}
          onChange={e => updateForm({ description: e.target.value })}
          placeholder="Describe your quiz..."
          maxLength={500}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-surface border border-foreground/10 text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
        <p className="text-xs text-foreground-muted mt-1">
          {form.description.length}/500 characters
        </p>
      </div>
    </div>
  );
}

function QuestionsStep({ form, updateForm }: { form: QuizForm; updateForm: (u: Partial<QuizForm>) => void }) {
  const addQuestion = () => {
    updateForm({
      questions: [...form.questions, {
        id: crypto.randomUUID(),
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
      }],
    });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    updateForm({
      questions: form.questions.map(q => q.id === id ? { ...q, ...updates } : q),
    });
  };

  const removeQuestion = (id: string) => {
    updateForm({ questions: form.questions.filter(q => q.id !== id) });
  };

  return (
    <div className="space-y-4">
      {form.questions.map((question, qIndex) => (
        <Card key={question.id} className="relative">
          <button
            onClick={() => removeQuestion(question.id)}
            className="absolute top-3 right-3 p-1 text-foreground-muted hover:text-error"
          >
            <TrashIcon className="w-4 h-4" />
          </button>

          <p className="text-sm font-medium text-foreground-muted mb-3">
            Question {qIndex + 1}
          </p>

          <Input
            value={question.text}
            onChange={e => updateQuestion(question.id, { text: e.target.value })}
            placeholder="Enter question"
            className="mb-4"
          />

          <div className="space-y-2">
            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center gap-2">
                <button
                  onClick={() => updateQuestion(question.id, { correctIndex: oIndex })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    question.correctIndex === oIndex
                      ? 'bg-success text-white'
                      : 'bg-surface border border-foreground/10 text-foreground-muted'
                  }`}
                >
                  {String.fromCharCode(65 + oIndex)}
                </button>
                <Input
                  value={option}
                  onChange={e => {
                    const newOptions = [...question.options];
                    newOptions[oIndex] = e.target.value;
                    updateQuestion(question.id, { options: newOptions });
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-foreground-muted mt-2">
            Click letter to mark correct answer
          </p>
        </Card>
      ))}

      <Button variant="outline" fullWidth onClick={addQuestion}>
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Question
      </Button>

      {form.questions.length === 0 && (
        <p className="text-center text-foreground-muted py-8">
          Add at least one question to continue
        </p>
      )}
    </div>
  );
}

function RewardsStep({ form, updateForm, walletAddress }: { form: QuizForm; updateForm: (u: Partial<QuizForm>) => void; walletAddress: string | null }) {
  const totalWinners = form.rewardPools.reduce((sum, p) => sum + p.winnerCount, 0);
  const totalPercentage = form.rewardPools.reduce((sum, p) => sum + p.percentage, 0);

  // Get selected token info for display
  const selectedRewardToken = getTokenByAddress(form.rewardToken);
  const selectedEntryToken = getTokenByAddress(form.entryFeeToken);

  const addPool = () => {
    if (form.rewardPools.length < 5) {
      updateForm({
        rewardPools: [...form.rewardPools, {
          tier: form.rewardPools.length + 1,
          name: `Pool ${form.rewardPools.length + 1}`,
          winnerCount: 100,
          percentage: 0,
        }],
      });
    }
  };

  const updatePool = (index: number, updates: Partial<RewardPool>) => {
    const newPools = [...form.rewardPools];
    newPools[index] = { ...newPools[index], ...updates };
    updateForm({ rewardPools: newPools });
  };

  const removePool = (index: number) => {
    if (form.rewardPools.length > 1) {
      updateForm({
        rewardPools: form.rewardPools.filter((_, i) => i !== index).map((p, i) => ({ ...p, tier: i + 1 })),
      });
    }
  };

  const calculateRewardPerWinner = (pool: RewardPool) => {
    if (!form.rewardAmount || pool.winnerCount === 0) return '0';
    const poolAmount = (parseFloat(form.rewardAmount) * pool.percentage) / 100;
    return (poolAmount / pool.winnerCount).toFixed(4);
  };

  return (
    <div className="space-y-4">
      {/* Network Indicator */}
      {IS_TESTNET && (
        <Card className="bg-warning/10 border-warning/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <div>
              <p className="text-sm font-medium text-warning">Testnet Mode</p>
              <p className="text-xs text-foreground-muted">Using Base Sepolia test tokens</p>
            </div>
          </div>
        </Card>
      )}

      {/* Token Selection - Dropdown */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Reward Token *
        </label>
        <TokenSelector
          value={form.rewardToken}
          onChange={(address) => updateForm({ rewardToken: address })}
          walletAddress={walletAddress}
          showBalance={true}
          placeholder="Select reward token"
        />
        <p className="text-xs text-foreground-muted mt-1">
          Token on {IS_TESTNET ? 'Base Sepolia' : 'Base'} network
        </p>
      </div>

      {/* Total Reward Amount */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Total Reward Pool *
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={form.rewardAmount}
            onChange={e => updateForm({ rewardAmount: e.target.value })}
            placeholder="1000"
            min="0"
            step="0.01"
            className="flex-1"
          />
          {selectedRewardToken && (
            <span className="px-3 py-2 rounded-lg bg-surface border border-foreground/10 text-foreground font-medium">
              {selectedRewardToken.symbol}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground-muted mt-1">
          Total amount to distribute among all winners
        </p>
      </div>

      {/* Entry Fee (Optional) - Token Dropdown */}
      <Card className="bg-surface/50">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          💰 Entry Fee (Optional)
        </h3>
        <p className="text-xs text-foreground-muted mb-3">
          Participants contribute to the pool. Fees are redistributed as rewards.
        </p>
        <div className="space-y-3">
          <TokenSelector
            value={form.entryFeeToken}
            onChange={(address) => updateForm({ entryFeeToken: address })}
            walletAddress={walletAddress}
            showBalance={false}
            placeholder="Select entry fee token"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={form.entryFee}
              onChange={e => updateForm({ entryFee: e.target.value })}
              placeholder="Amount"
              min="0"
              step="0.001"
              className="flex-1"
            />
            {selectedEntryToken && (
              <span className="px-3 py-2 rounded-lg bg-surface border border-foreground/10 text-foreground font-medium">
                {selectedEntryToken.symbol}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Pool Mode Toggle */}
      <Card className="bg-surface/50">
        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-foreground">Custom Pool Distribution</span>
            <p className="text-xs text-foreground-muted">Configure multiple reward tiers</p>
          </div>
          <input
            type="checkbox"
            checked={form.useCustomPools}
            onChange={e => {
              updateForm({ 
                useCustomPools: e.target.checked,
                rewardPools: e.target.checked ? form.rewardPools : DEFAULT_POOLS,
              });
            }}
            className="w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary"
          />
        </label>
      </Card>

      {/* Reward Pools */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">🏆 Reward Pools</h3>
          {totalPercentage !== 100 && (
            <span className="text-xs text-error">Total must be 100%</span>
          )}
        </div>

        <div className="space-y-3">
          {form.rewardPools.map((pool, index) => (
            <div key={pool.tier} className="p-3 rounded-lg bg-background/50 border border-foreground/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {pool.tier}
                  </span>
                  {form.useCustomPools ? (
                    <Input
                      value={pool.name}
                      onChange={e => updatePool(index, { name: e.target.value })}
                      className="w-32 h-7 text-sm"
                      placeholder="Pool name"
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground">{pool.name}</span>
                  )}
                </div>
                {form.useCustomPools && form.rewardPools.length > 1 && (
                  <button onClick={() => removePool(index)} className="text-foreground-muted hover:text-error">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-foreground-muted">Winners</label>
                  <Input
                    type="number"
                    value={pool.winnerCount}
                    onChange={e => updatePool(index, { winnerCount: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="10000"
                    disabled={!form.useCustomPools}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground-muted">Share %</label>
                  <Input
                    type="number"
                    value={pool.percentage}
                    onChange={e => updatePool(index, { percentage: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    disabled={!form.useCustomPools}
                    className="h-8"
                  />
                </div>
              </div>

              {form.rewardAmount && (
                <div className="mt-2 text-xs text-success">
                  ≈ {calculateRewardPerWinner(pool)} tokens per winner
                </div>
              )}
            </div>
          ))}
        </div>

        {form.useCustomPools && form.rewardPools.length < 5 && (
          <Button variant="outline" size="sm" onClick={addPool} className="mt-3">
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Pool
          </Button>
        )}
      </Card>

      {/* Summary */}
      {form.rewardAmount && (
        <Card className="bg-success/10 border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📊</span>
            <span className="font-medium text-foreground">Distribution Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-foreground-muted">Total Pool:</div>
            <div className="text-foreground font-medium">{form.rewardAmount} tokens</div>
            <div className="text-foreground-muted">Total Winners:</div>
            <div className="text-foreground font-medium">{totalWinners.toLocaleString()}</div>
            <div className="text-foreground-muted">Distribution:</div>
            <div className="text-foreground font-medium">{totalPercentage}%</div>
          </div>
        </Card>
      )}
    </div>
  );
}

function SettingsStep({ form, updateForm, walletAddress }: { form: QuizForm; updateForm: (u: Partial<QuizForm>) => void; walletAddress: string | null }) {
  const selectedStakeToken = getTokenByAddress(form.stakeToken);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Time per Question (seconds)
        </label>
        <Input
          type="number"
          value={form.timePerQuestion}
          onChange={e => updateForm({ timePerQuestion: parseInt(e.target.value) || 30 })}
          min="10"
          max="120"
        />
        <p className="text-xs text-foreground-muted mt-1">
          Faster answers = higher rank = better rewards
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Start Time (optional)
        </label>
        <DatePicker
          value={form.startsAt}
          onChange={(value) => updateForm({ startsAt: value })}
          placeholder="Select start date & time"
          minDate={new Date()}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          End Time (optional)
        </label>
        <DatePicker
          value={form.endsAt}
          onChange={(value) => updateForm({ endsAt: value })}
          placeholder="Select end date & time"
          minDate={form.startsAt ? new Date(form.startsAt) : new Date()}
        />
      </div>

      <Card className="mt-6">
        <h3 className="text-sm font-medium text-foreground mb-3">
          🔒 Stake Requirement (optional)
        </h3>
        <p className="text-xs text-foreground-muted mb-3">
          Require participants to stake tokens to join
        </p>
        <div className="space-y-3">
          <TokenSelector
            value={form.stakeToken}
            onChange={(address) => updateForm({ stakeToken: address })}
            walletAddress={walletAddress}
            showBalance={false}
            placeholder="Select stake token"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={form.stakeAmount}
              onChange={e => updateForm({ stakeAmount: e.target.value })}
              placeholder="Amount"
              min="0"
              step="0.01"
              className="flex-1"
            />
            {selectedStakeToken && (
              <span className="px-3 py-2 rounded-lg bg-surface border border-foreground/10 text-foreground font-medium">
                {selectedStakeToken.symbol}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function PreviewStep({ form, walletConnected }: { form: QuizForm; walletConnected: boolean }) {
  const totalWinners = form.rewardPools.reduce((sum, p) => sum + p.winnerCount, 0);
  const rewardToken = getTokenByAddress(form.rewardToken);
  const entryToken = getTokenByAddress(form.entryFeeToken);
  const stakeToken = getTokenByAddress(form.stakeToken);

  return (
    <div className="space-y-4">
      {/* Wallet Connection Warning */}
      {!walletConnected && (
        <Card className="bg-warning/10 border-warning/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-foreground">Wallet Not Connected</p>
              <p className="text-xs text-foreground-muted">Connect your wallet in the header to publish this quiz</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold text-foreground mb-2">{form.title}</h2>
        {form.description && (
          <p className="text-foreground-muted mb-4">{form.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-foreground/10">
          <div>
            <p className="text-xs text-foreground-muted">Questions</p>
            <p className="text-lg font-semibold text-foreground">{form.questions.length}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Time per Question</p>
            <p className="text-lg font-semibold text-foreground">{form.timePerQuestion}s</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Total Winners</p>
            <p className="text-lg font-semibold text-foreground">{totalWinners.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Total Pool</p>
            <p className="text-lg font-semibold text-success">
              {form.rewardAmount} {rewardToken?.symbol || 'tokens'}
            </p>
          </div>
        </div>
      </Card>

      {/* Reward Pools Preview */}
      <Card>
        <h3 className="text-sm font-medium text-foreground mb-3">🏆 Reward Distribution</h3>
        <div className="space-y-2">
          {form.rewardPools.map((pool) => {
            const poolAmount = form.rewardAmount 
              ? ((parseFloat(form.rewardAmount) * pool.percentage) / 100).toFixed(2)
              : '0';
            const perWinner = pool.winnerCount > 0 && form.rewardAmount
              ? ((parseFloat(form.rewardAmount) * pool.percentage) / 100 / pool.winnerCount).toFixed(4)
              : '0';

            return (
              <div key={pool.tier} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {pool.tier}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pool.name}</p>
                    <p className="text-xs text-foreground-muted">
                      Top {pool.tier === 1 ? pool.winnerCount : `${form.rewardPools.slice(0, pool.tier - 1).reduce((s, p) => s + p.winnerCount, 0) + 1}-${form.rewardPools.slice(0, pool.tier).reduce((s, p) => s + p.winnerCount, 0)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-success">
                    {poolAmount} {rewardToken?.symbol || ''} ({pool.percentage}%)
                  </p>
                  <p className="text-xs text-foreground-muted">{perWinner}/winner</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Entry Fee */}
      {form.entryFee && form.entryFeeToken && (
        <Card className="bg-warning/10 border-warning/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <div>
              <p className="text-sm font-medium text-foreground">Entry Fee Required</p>
              <p className="text-xs text-foreground-muted">
                {form.entryFee} {entryToken?.symbol || 'tokens'} per participant
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stake Requirement */}
      {form.stakeToken && form.stakeAmount && (
        <Card className="bg-primary/10 border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <div>
              <p className="text-sm font-medium text-foreground">Stake Required</p>
              <p className="text-xs text-foreground-muted">
                {form.stakeAmount} {stakeToken?.symbol || 'tokens'} to participate
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Schedule */}
      {(form.startsAt || form.endsAt) && (
        <Card>
          <h3 className="text-sm font-medium text-foreground mb-3">📅 Schedule</h3>
          <div className="space-y-2 text-sm">
            {form.startsAt && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Starts:</span>
                <span className="text-foreground">
                  {new Date(form.startsAt).toLocaleString()}
                </span>
              </div>
            )}
            {form.endsAt && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Ends:</span>
                <span className="text-foreground">
                  {new Date(form.endsAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-medium text-foreground mb-3">Questions Preview</h3>
        <div className="space-y-4">
          {form.questions.map((q, i) => (
            <div key={q.id} className="pb-4 border-b border-foreground/10 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-foreground mb-2">
                {i + 1}. {q.text}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.filter(o => o.trim()).map((opt, j) => (
                  <div
                    key={j}
                    className={`text-xs px-2 py-1 rounded ${
                      j === q.correctIndex
                        ? 'bg-success/20 text-success'
                        : 'bg-surface text-foreground-muted'
                    }`}
                  >
                    {String.fromCharCode(65 + j)}. {opt}
                  </div>
                ))}
              </div>
            </div>
          ))}
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
