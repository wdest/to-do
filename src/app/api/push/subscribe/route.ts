import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zpydvfcizdugjfnnwxlm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWR2ZmNpemR1Z2pmbm53eGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4Mjc1ODAsImV4cCI6MjEwNjQwMzU4MH0.wHwkCuI3Sw3cxfzqoeSDwqDlCjm-gi3eYaoyhUzT7s8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

    // Store subscription in Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .insert([{ subscription }]);

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error processing subscription:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
