'use client';

import { Input } from '@/components/ui/input';
import { QuizForm } from './types';

interface BasicInfoStepProps {
  form: QuizForm;
  updateForm: (updates: Partial<QuizForm>) => void;
}

export function BasicInfoStep({ form, updateForm }: BasicInfoStepProps) {
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
