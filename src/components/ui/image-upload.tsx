'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  currentImage?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  folder: 'covers' | 'questions';
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ImageUpload({ currentImage, onUpload, onRemove, folder, className = '' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG, PNG, GIF, and WebP are supported';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 5MB';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Upload failed');
      }

      const data = await res.json();
      onUpload(data.url);
    } catch (err) {
      console.error('[ImageUpload] Error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  if (currentImage) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        <div className="relative aspect-video w-full">
          <Image
            src={currentImage}
            alt="Uploaded image"
            fill
            className="object-cover"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-foreground/20 hover:border-foreground/40 hover:bg-surface/50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-foreground-muted">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 text-foreground-muted" />
            <p className="text-sm text-foreground-muted">
              <span className="text-primary font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-foreground-muted">
              JPG, PNG, GIF, WebP (max 5MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-error">
          <span>❌</span>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-foreground-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
