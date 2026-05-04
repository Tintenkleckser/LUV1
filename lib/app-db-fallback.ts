import { supabase } from '@/lib/supabase';

export function isPrismaConnectionError(error: any) {
  const message = String(error?.message ?? '');
  return error?.code === 'P1000'
    || error?.code === 'P1001'
    || message.includes("Can't reach database server")
    || message.includes('Authentication failed against database server')
    || message.includes('provided database credentials')
    || message.includes('Tenant or user not found');
}

export function createId() {
  return `cm${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function findUserByEmailViaSupabase(email: string) {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUserViaSupabase(data: { email: string; password: string; name?: string | null }) {
  const now = new Date().toISOString();
  const { data: user, error } = await supabase
    .from('User')
    .insert({
      id: createId(),
      email: data.email,
      password: data.password,
      name: data.name ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return user;
}

export async function listClientsViaSupabase(userId: string) {
  const { data: clients, error } = await supabase
    .from('Client')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });
  if (error) throw error;

  return Promise.all((clients ?? []).map(async (client: any) => {
    const { count } = await supabase
      .from('Assessment')
      .select('*', { count: 'exact', head: true })
      .eq('clientId', client.id);
    return { ...client, _count: { assessments: count ?? 0 } };
  }));
}

export async function findClientViaSupabase(userId: string, clientCode: string) {
  const { data, error } = await supabase
    .from('Client')
    .select('*')
    .eq('userId', userId)
    .eq('clientCode', clientCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createClientViaSupabase(userId: string, clientCode: string) {
  const { data, error } = await supabase
    .from('Client')
    .insert({
      id: createId(),
      userId,
      clientCode,
      createdAt: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listAssessmentsViaSupabase(userId: string, clientId?: string | null) {
  let query = supabase
    .from('Assessment')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });
  if (clientId) query = query.eq('clientId', clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createAssessmentViaSupabase(userId: string, body: any) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('Assessment')
    .insert({
      id: createId(),
      clientId: body?.client_id ?? '',
      userId,
      ratings: body?.ratings ?? {},
      notes: body?.notes ?? null,
      status: body?.status ?? 'completed',
      currentPhase: body?.currentPhase ?? 'ratings',
      currentIndex: body?.currentIndex ?? 0,
      q1: body?.q1 ?? null,
      q2: body?.q2 ?? null,
      q3: body?.q3 ?? null,
      q4: body?.q4 ?? null,
      q5: body?.q5 ?? null,
      q6: body?.q6 ?? null,
      q7: body?.q7 ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findAssessmentViaSupabase(id: string) {
  const { data, error } = await supabase
    .from('Assessment')
    .select('*, client:Client(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateAssessmentViaSupabase(id: string, data: Record<string, any>) {
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const { data: assessment, error } = await supabase
    .from('Assessment')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return assessment;
}
