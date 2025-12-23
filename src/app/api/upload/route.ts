/**
 * POST /api/upload - Upload image to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const BUCKET_NAME = 'quiz-images';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'covers';

    if (!file) {
      return NextResponse.json(
        { error: 'NO_FILE', message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'INVALID_TYPE', message: 'Only JPG, PNG, GIF, and WebP are supported' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'FILE_TOO_LARGE', message: 'Image must be less than 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = createServerClient();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[Upload] Supabase error:', error);
      return NextResponse.json(
        { error: 'UPLOAD_FAILED', message: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error('[Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
