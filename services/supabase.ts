
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xsefgwhywcuzfnawtyru.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZWZnd2h5d2N1emZuYXd0eXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzMxMDEsImV4cCI6MjA4MDEwOTEwMX0._ZxWGsoU-rN8Yuf_v_7zGrivk2GKgb6QHBbT3QgtrCk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
