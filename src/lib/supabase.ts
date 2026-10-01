import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zpydvfcizdugjfnnwxlm.supabase.co'

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWR2ZmNpemR1Z2pmbm53eGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4Mjc1ODAsImV4cCI6MjEwNjQwMzU4MH0.wHwkCuI3Sw3cxfzqoeSDwqDlCjm-gi3eYaoyhUzT7s8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
