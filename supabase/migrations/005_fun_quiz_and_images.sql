-- Migration: 005_fun_quiz_and_images
-- Add support for fun quiz mode and image uploads

-- Add is_fun_quiz column to quizzes table
-- Fun quizzes don't require rewards, entry fees, or stakes
ALTER TABLE quizzes ADD COLUMN is_fun_quiz BOOLEAN DEFAULT FALSE;

-- Add cover_image_url column to quizzes table
-- Stores the URL of the quiz cover image from Supabase Storage
ALTER TABLE quizzes ADD COLUMN cover_image_url TEXT;

-- Note: Question images are stored in questions_json JSONB field
-- Each question object can have an optional "imageUrl" property

-- Create index for filtering fun quizzes
CREATE INDEX idx_quizzes_is_fun_quiz ON quizzes(is_fun_quiz);

-- Update RLS policy to allow viewing draft quizzes by creator
-- (Existing policies already allow this through the permissive UPDATE policy)

COMMENT ON COLUMN quizzes.is_fun_quiz IS 'When true, quiz has no rewards/fees/stakes and skips blockchain';
COMMENT ON COLUMN quizzes.cover_image_url IS 'URL to cover image stored in Supabase Storage quiz-images bucket';
