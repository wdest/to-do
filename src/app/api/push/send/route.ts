import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zpydvfcizdugjfnnwxlm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWR2ZmNpemR1Z2pmbm53eGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4Mjc1ODAsImV4cCI6MjEwNjQwMzU4MH0.wHwkCuI3Sw3cxfzqoeSDwqDlCjm-gi3eYaoyhUzT7s8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEIKHqXfgpvYc_wwyVTG2eJpCWkNm8q2AWw_zFppy8PFJDDeq-ZfCvaUn4M02_CFVBfSSt32anUcxO2gBb2Eudk';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'B1dC5tFtRtj8gRfPDQ5CwN7EmFeAFIyjOSu13W8bVHg';

webpush.setVapidDetails(
  'mailto:desttex@example.com',
  publicVapidKey,
  privateVapidKey
);

export async function POST(req: Request) {
  try {
    const { title, body } = await req.json();

    // Fetch all subscriptions
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found.' });
    }

    const payload = JSON.stringify({
      title: title || 'Xatırlatma!',
      body: body || 'Tapşırığınızın vaxtıdır.',
      icon: '/favicon.ico'
    });

    const sendPromises = subs.map(sub => 
      webpush.sendNotification(sub.subscription, payload).catch(e => console.error(e))
    );

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, message: 'Notifications sent.' });
  } catch (err) {
    console.error('Error sending push:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
