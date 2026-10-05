import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/server/request-security';
import webpush from 'web-push';
import { adminClient } from '@/lib/server/auth';
import { validSubscription } from '@/lib/push-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// This route is exclusively a scheduler endpoint; no public broadcast operation.
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  try {
    const db = adminClient();
    const { error: cleanupError } = await db.from('tasks').delete().eq('is_done', true)
      .lte('completed_at', new Date(Date.now() - 3 * 86400000).toISOString());
    if (cleanupError) throw cleanupError;
    if (!publicKey || !privateKey || !subject) return NextResponse.json({ success: true, cleanup: true, pushConfigured: false });
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const { data: jobs, error } = await db.rpc('claim_due_reminders');
    if (error) throw error;
    let sent = 0;
    for (const job of jobs || []) {
      const { data: subscriptions, error: subscriptionError } = await db.from('push_subscriptions')
        .select('id, subscription').eq('user_id', job.user_id);
      if (subscriptionError) throw subscriptionError;
      let retry = false;
      let delivered = false;
      // A generic message protects task text on lock screens and shared devices.
      for (const entry of subscriptions || []) {
        if (!validSubscription(entry.subscription)) continue;
        try {
          await webpush.sendNotification(entry.subscription, JSON.stringify({
            title: 'Nilufər', body: 'Bir tapşırığının xatırlatma vaxtıdır. Baxmaq üçün daxil ol.',
            icon: '/bell-icon.png', tag: `reminder-${job.id}-${job.reminder_at}`,
          }), { TTL: 300, timeout: 3000 });
          delivered = true;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db.from('push_subscriptions').delete().eq('id', entry.id).eq('user_id', job.user_id);
          } else { retry = true; }
        }
      }
      const { error: finishError } = await db.rpc('finish_reminder', {
        task_id: job.id, lease_id: job.reminder_lease, succeeded: delivered && !retry,
      });
      if (finishError) throw finishError;
      if (delivered) sent++;
    }
    return NextResponse.json({ success: true, sent });
  } catch {
    return NextResponse.json({ error: 'Reminder processing failed' }, { status: 500 });
  }
}
