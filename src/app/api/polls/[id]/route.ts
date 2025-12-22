import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/polls/[id] - Get poll details with vote counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Get vote counts per option
    const { data: votes, error: votesError } = await supabase
      .from('poll_votes')
      .select('option_index')
      .eq('poll_id', id);

    if (votesError) throw votesError;

    // Calculate votes per option
    const voteCounts: Record<number, number> = {};
    votes?.forEach((vote) => {
      voteCounts[vote.option_index] = (voteCounts[vote.option_index] || 0) + 1;
    });

    // Update options with vote counts
    const optionsWithVotes = poll.options.map((opt: { index: number; text: string }) => ({
      ...opt,
      votes: voteCounts[opt.index] || 0,
    }));

    return NextResponse.json({
      poll: {
        ...poll,
        options: optionsWithVotes,
      },
    });
  } catch (error) {
    console.error('Error fetching poll:', error);
    return NextResponse.json(
      { error: 'Failed to fetch poll' },
      { status: 500 }
    );
  }
}
