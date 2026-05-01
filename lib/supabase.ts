import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase API key');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

export const supabase: any = new Proxy({}, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver);
  },
});

// Types for Supabase tables
export interface SupabaseClient {
  id: string;
  client_id: string;
  berater_id: string;
  created_at: string;
}

export interface SupabaseAssessment {
  id: string;
  client_id: string;
  berater_id: string;
  ratings: Record<string, number | string>;
  created_at: string;
  notes?: string | null;
  ai_analysis?: string | null;
}

export interface SupabaseCompetency {
  id: string;
  name: string;
  category: string;
  description: string | null;
  indicators: string | null;
  definition: string | null;
  order_index: number | null;
}

export interface SupabaseChat {
  id: string;
  assessment_id: string;
  berater_id: string;
  created_at: string;
  title?: string | null;
}

export interface SupabaseMessage {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface WissenLuv {
  id: string;
  category: string;
  content: string;
  type: string | null;
}

export interface WissenHandbuch {
  id: string;
  topic: string;
  content: string;
  category: string | null;
}
