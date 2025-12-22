import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/polls - List all polls
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const creatorFid = searchParams.get('creator_fid');

    let query = supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (creatorFid) {
      query = query.eq('creator_fid', creatorFid);
    }

    const { data: polls, error } = await query;

    if (error) throw error;

    return NextResponse.json({ polls });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    );
  }
}

// POST /api/polls - Create a new poll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      creatorFid,
      creatorAddress,
      creatorWallet, // Support both field names
      title,
      description,
      options,
      endsAt,
      isMultipleChoice,
      isAnonymous,
      requireToken,
      requireTokenAmount,
    } = body;
    
    // Normalize creator address (support both field names)
    const walletAddress = creatorAddress || creatorWallet || null;

    // Validation
    if (!creatorFid || !title || !options || options.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorFid, title, and at least 2 options' },
        { status: 400 }
      );
    }

    if (options.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 options allowed' },
        { status: 400 }
      );
    }

    const { data: poll, error } = await supabase
      .from('polls')
      .insert({
        creator_fid: creatorFid,
        creator_address: walletAddress,
        title,
        description,
        options: options.map((opt: string, idx: number) => ({
          index: idx,
          text: opt,
          votes: 0,
        })),
        ends_at: endsAt || null,
        is_multiple_choice: isMultipleChoice || false,
        is_anonymous: isAnonymous || false,
        require_token: requireToken || null,
        require_token_amount: requireTokenAmount || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating poll:', error);
      throw error;
    }

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
