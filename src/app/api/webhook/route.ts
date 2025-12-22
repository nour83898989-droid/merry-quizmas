import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface WebhookEvent {
  event: 'frame_added' | 'frame_removed' | 'notifications_enabled' | 'notifications_disabled';
  notificationDetails?: {
    url: string;
    token: string;
  };
  fid: number;
}

// Handle Farcaster webhook events
export async function POST(request: NextRequest) {
  try {
    const body: WebhookEvent = await request.json();
    const supabase = createClient();

    switch (body.event) {
      case 'frame_added':
        // User added the mini app
        console.log(`User ${body.fid} added the app`);
        break;

      case 'frame_removed':
        // User removed the mini app - delete their notification token
        await supabase
          .from('notification_tokens')
          .delete()
          .eq('fid', body.fid);
        console.log(`User ${body.fid} removed the app`);
        break;

      case 'notifications_enabled':
        // Store notification token
        if (body.notificationDetails) {
          await supabase
            .from('notification_tokens')
            .upsert({
              fid: body.fid,
              token: body.notificationDetails.token,
              url: body.notificationDetails.url,
              enabled: true,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'fid',
            });
          console.log(`Notifications enabled for user ${body.fid}`);
        }
        break;

      case 'notifications_disabled':
        // Mark notifications as disabled
        await supabase
          .from('notification_tokens')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('fid', body.fid);
        console.log(`Notifications disabled for user ${body.fid}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
