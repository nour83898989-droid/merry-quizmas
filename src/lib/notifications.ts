import { createClient } from '@/lib/supabase/client';

interface NotificationPayload {
  title: string;
  body: string;
  targetUrl: string;
}

// Rate limiting: 1 notification per 30 seconds per user, 100 per day
const RATE_LIMIT_INTERVAL_MS = 30 * 1000;
const DAILY_LIMIT = 100;

const lastNotificationTime = new Map<number, number>();
const dailyNotificationCount = new Map<number, { count: number; date: string }>();

function checkRateLimit(fid: number): boolean {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // Check interval limit
  const lastTime = lastNotificationTime.get(fid);
  if (lastTime && now - lastTime < RATE_LIMIT_INTERVAL_MS) {
    return false;
  }

  // Check daily limit
  const dailyData = dailyNotificationCount.get(fid);
  if (dailyData) {
    if (dailyData.date === today && dailyData.count >= DAILY_LIMIT) {
      return false;
    }
    if (dailyData.date !== today) {
      dailyNotificationCount.set(fid, { count: 0, date: today });
    }
  }

  return true;
}

function updateRateLimitCounters(fid: number): void {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  lastNotificationTime.set(fid, now);

  const dailyData = dailyNotificationCount.get(fid);
  if (dailyData && dailyData.date === today) {
    dailyData.count++;
  } else {
    dailyNotificationCount.set(fid, { count: 1, date: today });
  }
}

export async function sendNotification(
  fid: number,
  payload: NotificationPayload
): Promise<boolean> {
  // Check rate limit
  if (!checkRateLimit(fid)) {
    console.log(`Rate limit exceeded for user ${fid}`);
    return false;
  }

  const supabase = createClient();

  // Get user's notification token
  const { data: tokenData, error } = await supabase
    .from('notification_tokens')
    .select('token, url, enabled')
    .eq('fid', fid)
    .single();

  if (error || !tokenData || !tokenData.enabled) {
    console.log(`No valid notification token for user ${fid}`);
    return false;
  }

  try {
    // Send notification via Farcaster's notification service
    const response = await fetch(tokenData.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: payload.title,
        body: payload.body,
        targetUrl: payload.targetUrl,
        tokens: [tokenData.token],
      }),
    });

    if (!response.ok) {
      throw new Error(`Notification failed: ${response.status}`);
    }

    updateRateLimitCounters(fid);
    return true;
  } catch (error) {
    console.error(`Failed to send notification to user ${fid}:`, error);
    return false;
  }
}

export async function notifyQuizStart(quizId: string, quizTitle: string): Promise<void> {
  const supabase = createClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-app.vercel.app';

  // Get all users with notifications enabled
  const { data: tokens } = await supabase
    .from('notification_tokens')
    .select('fid')
    .eq('enabled', true);

  if (!tokens) return;

  const payload: NotificationPayload = {
    title: 'Quiz Starting Soon!',
    body: `"${quizTitle}" is about to start. Join now to win rewards!`,
    targetUrl: `${baseUrl}/quiz/${quizId}`,
  };

  // Send notifications in parallel (with rate limiting)
  await Promise.all(
    tokens.map(({ fid }) => sendNotification(fid, payload))
  );
}

export async function notifyWinner(
  fid: number,
  quizTitle: string,
  rewardAmount: string,
  quizId: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-app.vercel.app';

  await sendNotification(fid, {
    title: '🏆 Congratulations!',
    body: `You won ${rewardAmount} tokens in "${quizTitle}"!`,
    targetUrl: `${baseUrl}/quiz/${quizId}/leaderboard`,
  });
}
