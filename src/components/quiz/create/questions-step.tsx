'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QuizForm, Question } from './types';

interface QuestionsStepProps {
  form: QuizForm;
  updateForm: (updates: Partial<QuizForm>) => void;
}

export function QuestionsStep({ form, updateForm }: QuestionsStepProps) {
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
