import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Supabase environment is not configured');

// Client-rendered app: the SDK manages token refresh. RLS enforces ownership.
export const supabase = createClient(url, key);
