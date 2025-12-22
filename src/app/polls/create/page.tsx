'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';

export default function CreatePollPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    options: ['', ''],
    endsAt: '',
    isMultipleChoice: false,
    isAnonymous: false,
  });

  const addOption = () => {
    if (form.options.length < 10) {
      setForm({ ...form, options: [...form.options, ''] });
    }
  };

  const removeOption = (index: number) => {
    if (form.options.length > 2) {
      setForm({
        ...form,
        options: form.options.filter((_, i) => i !== index),
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  const canSubmit = () => {
    return (
      form.title.trim().length >= 3 &&
      form.options.filter((o) => o.trim()).length >= 2
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setIsSubmitting(true);
    try {
      // TODO: Get actual FID from wallet/auth
      const creatorFid = 1; // Placeholder

      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorFid,
          title: form.title,
          description: form.description || null,
          options: form.options.filter((o) => o.trim()),
          endsAt: form.endsAt || null,
          isMultipleChoice: form.isMultipleChoice,
          isAnonymous: form.isAnonymous,
        }),
      });

      if (!res.ok) throw new Error('Failed to create poll');
      const data = await res.json();
      router.push(`/polls/${data.poll.id}`);
    } catch (error) {
      console.error('Error creating poll:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ChristmasLayout>
      <main className="min-h-screen pb-24">
        {/* Content */}
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-bold text-foreground mb-4">📊 Create Poll</h1>
          {/* Title */}
          <Card className="christmas-card">
            <label className="block text-sm font-medium text-foreground mb-2">
              Question *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What do you want to ask?"
              maxLength={200}
            />
            <p className="text-xs text-foreground-muted mt-1">
              {form.title.length}/200
            </p>
          </Card>

          {/* Description */}
          <Card className="christmas-card">
            <label className="block text-sm font-medium text-foreground mb-2">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add more context..."
              maxLength={500}
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-foreground/10 text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </Card>

          {/* Options */}
          <Card className="christmas-card">
            <label className="block text-sm font-medium text-foreground mb-3">
              Options * (min 2, max 10)
            </label>
            <div className="space-y-2">
              {form.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  {form.options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="p-2 text-foreground-muted hover:text-error"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.options.length < 10 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="mt-3"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Option
              </Button>
            )}
          </Card>

          {/* Settings */}
          <Card className="christmas-card">
            <label className="block text-sm font-medium text-foreground mb-3">
              Settings
            </label>
            
            {/* End time */}
            <div className="mb-4">
              <label className="block text-xs text-foreground-muted mb-1">
                End time (optional)
              </label>
              <DatePicker
                value={form.endsAt}
                onChange={(value) => setForm({ ...form, endsAt: value })}
                placeholder="Select end date & time"
                minDate={new Date()}
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-foreground">Allow multiple choices</span>
                <input
                  type="checkbox"
                  checked={form.isMultipleChoice}
                  onChange={(e) => setForm({ ...form, isMultipleChoice: e.target.checked })}
                  className="w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-foreground">Anonymous voting</span>
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                  className="w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary"
                />
              </label>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-foreground/10">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            isLoading={isSubmitting}
            fullWidth
            className="christmas-gradient text-white"
          >
            Create Poll
          </Button>
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
