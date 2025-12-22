import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/polls/[id]/vote - Vote on a poll
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { voterFid, voterAddress, optionIndexes } = body;

    if (!voterFid || optionIndexes === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: voterFid, optionIndexes' },
        { status: 400 }
      );
    }

    // Get poll to check if it's still active
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Check if poll has ended
    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
      return NextResponse.json({ error: 'Poll has ended' }, { status: 400 });
    }

    // Check if user already voted (for single choice)
    const { data: existingVotes } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', id)
      .eq('voter_fid', voterFid);

    if (!poll.is_multiple_choice && existingVotes && existingVotes.length > 0) {
      return NextResponse.json(
        { error: 'You have already voted on this poll' },
        { status: 400 }
      );
    }

    // Validate option indexes
    const indexes = Array.isArray(optionIndexes) ? optionIndexes : [optionIndexes];
    const maxIndex = poll.options.length - 1;
    
    for (const idx of indexes) {
      if (idx < 0 || idx > maxIndex) {
        return NextResponse.json(
          { error: `Invalid option index: ${idx}` },
          { status: 400 }
        );
      }
    }

    // For single choice, only allow one vote
    if (!poll.is_multiple_choice && indexes.length > 1) {
      return NextResponse.json(
        { error: 'This poll only allows single choice' },
        { status: 400 }
      );
    }

    // Insert votes
    const votesToInsert = indexes.map((optionIndex: number) => ({
      poll_id: id,
      voter_fid: voterFid,
      voter_address: voterAddress,
      option_index: optionIndex,
    }));

    const { error: voteError } = await supabase
      .from('poll_votes')
      .insert(votesToInsert);

    if (voteError) {
      if (voteError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted for this option' },
          { status: 400 }
        );
      }
      throw voteError;
    }

    return NextResponse.json({ success: true, votedOptions: indexes });
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
}

// GET /api/polls/[id]/vote - Check if user has voted
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const voterFid = searchParams.get('voter_fid');

    if (!voterFid) {
      return NextResponse.json(
        { error: 'Missing voter_fid parameter' },
        { status: 400 }
      );
    }

    const { data: votes, error } = await supabase
      .from('poll_votes')
      .select('option_index')
      .eq('poll_id', id)
      .eq('voter_fid', voterFid);

    if (error) throw error;

    return NextResponse.json({
      hasVoted: votes && votes.length > 0,
      votedOptions: votes?.map((v) => v.option_index) || [],
    });
  } catch (error) {
    console.error('Error checking vote:', error);
    return NextResponse.json(
      { error: 'Failed to check vote status' },
      { status: 500 }
    );
  }
}
