# Design Document: Investor Features

## Overview

This design document outlines the implementation of four key features requested by investors: Quiz Without Rewards Mode, Image Support for Quizzes, Share Functionality, and Admin Panel Delete Fix. These features enhance the quiz platform's versatility and user experience.

## Architecture

The features integrate with the existing Next.js application architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Create Quiz Page    │  Quiz Detail Page  │  Admin Panel    │
│  - Fun mode toggle   │  - Share modal     │  - Delete APIs  │
│  - Image uploads     │  - Image display   │                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
├─────────────────────────────────────────────────────────────┤
│  /api/quizzes        │  /api/upload       │  /api/admin     │
│  - is_fun_quiz flag  │  - Supabase upload │  - DELETE ops   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
├─────────────────────────────────────────────────────────────┤
│  Database (quizzes)  │  Storage (images)                    │
│  - is_fun_quiz       │  - quiz-images bucket                │
│  - cover_image_url   │                                      │
│  - question images   │                                      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Fun Quiz Mode Toggle Component

```typescript
interface FunQuizToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}
```

### 2. Image Upload Component

```typescript
interface ImageUploadProps {
  onUpload: (url: string) => void;
  onError: (error: string) => void;
  currentImage?: string;
  bucket: 'quiz-covers' | 'question-images';
}
```

### 3. Share Modal Component

```typescript
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  quizTitle: string;
}
```

### 4. Admin Delete API

```typescript
interface DeleteRequest {
  type: 'quiz' | 'poll' | 'leaderboard' | 'reward';
  id: string;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}
```

## Data Models

### Database Schema Updates

```sql
-- Add to quizzes table
ALTER TABLE quizzes ADD COLUMN is_fun_quiz BOOLEAN DEFAULT FALSE;
ALTER TABLE quizzes ADD COLUMN cover_image_url TEXT;

-- Questions JSON structure update
{
  "questions": [
    {
      "id": "string",
      "text": "string",
      "options": ["string"],
      "correctIndex": number,
      "imageUrl": "string | null"  // NEW
    }
  ]
}
```

### Supabase Storage Bucket

```
quiz-images/
├── covers/
│   └── {quiz_id}.{ext}
└── questions/
    └── {quiz_id}/
        └── {question_id}.{ext}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Fun Quiz Mode Hides Reward Sections
*For any* quiz creation form state where funQuizMode is true, the rendered output should not contain reward pool, entry fee, or stake requirement input elements.
**Validates: Requirements 1.1**

### Property 2: Fun Quiz Display Message
*For any* quiz with is_fun_quiz=true, when displayed, the UI should contain the text "for fun" or "knowledge only".
**Validates: Requirements 1.2**

### Property 3: Fun Quiz Skips Blockchain
*For any* quiz creation with funQuizMode=true, the createQuizOnChain function should not be called.
**Validates: Requirements 1.3**

### Property 4: Image Upload Round Trip
*For any* valid image file uploaded to Supabase Storage, the returned URL should be accessible and return the same image data.
**Validates: Requirements 2.3**

### Property 5: Cover Image Rendering
*For any* quiz with a non-null cover_image_url, the quiz list item should render an img element with that URL as src.
**Validates: Requirements 2.4**

### Property 6: Question Image Rendering Order
*For any* question with a non-null imageUrl, the image element should appear before the question text element in the DOM tree.
**Validates: Requirements 2.5**

### Property 7: Share URL Clipboard Copy
*For any* quiz ID, when copy link is triggered, the clipboard should contain the full quiz URL in format `{APP_URL}/quiz/{id}`.
**Validates: Requirements 3.3**

### Property 8: Farcaster Share URL Format
*For any* quiz with title and ID, the Farcaster share URL should be `https://warpcast.com/~/compose?text={encodedTitle}&embeds[]={quizUrl}`.
**Validates: Requirements 3.4**

### Property 9: Twitter Share URL Format
*For any* quiz with title and ID, the Twitter share URL should be `https://twitter.com/intent/tweet?text={encodedTitle}&url={quizUrl}`.
**Validates: Requirements 3.5**

### Property 10: Quiz Delete Removes Data
*For any* quiz ID that exists in database, after delete operation, querying that ID should return null/not found.
**Validates: Requirements 4.1**

### Property 11: Poll Delete Removes Data
*For any* poll ID that exists in database, after delete operation, querying that ID should return null/not found.
**Validates: Requirements 4.2**

### Property 12: Leaderboard Entry Delete
*For any* leaderboard entry ID that exists, after delete operation, querying that ID should return null/not found.
**Validates: Requirements 4.3**

## Error Handling

### Image Upload Errors
- File too large (>5MB): Show "Image must be less than 5MB"
- Invalid format: Show "Only JPG, PNG, GIF, and WebP are supported"
- Upload failure: Show "Upload failed. Please try again." with retry button
- Network error: Show "Network error. Check your connection."

### Delete Operation Errors
- Not authorized: Return 403 with "Admin access required"
- Item not found: Return 404 with "Item not found"
- Database error: Return 500 with "Delete operation failed"
- Foreign key constraint: Cascade delete related records first

## Testing Strategy

### Unit Tests
- Test FunQuizToggle component state changes
- Test ImageUpload component file validation
- Test ShareModal URL generation functions
- Test admin delete API request handling

### Property-Based Tests
Using fast-check library for property-based testing:

- **Property 1-3**: Generate random form states, verify fun quiz mode behavior
- **Property 4**: Generate random image files, verify upload/download consistency
- **Property 5-6**: Generate random quiz/question data, verify rendering
- **Property 7-9**: Generate random quiz titles/IDs, verify URL formats
- **Property 10-12**: Generate random IDs, verify delete operations

### Integration Tests
- Full flow: Create fun quiz → Display → Join without wallet
- Full flow: Upload image → Create quiz → View in list
- Full flow: Publish quiz → Share modal → Copy link
- Full flow: Admin login → Delete quiz → Verify removal
