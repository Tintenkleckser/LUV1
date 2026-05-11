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

export function isPrismaRecoverableDbError(error: any) {
  return isPrismaConnectionError(error) || error?.code === 'P2022';
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

export async function findUserProfileViaSupabase(userId: string) {
  const { data: user, error } = await supabase
    .from('User')
    .select('id, name, email, createdAt')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!user) return null;

  const clients = await listClientsViaSupabase(userId);
  const { count: assessmentsCount, error: assessmentsError } = await supabase
    .from('Assessment')
    .select('*', { count: 'exact', head: true })
    .eq('userId', userId);
  if (assessmentsError) throw assessmentsError;

  return {
    ...user,
    clients,
    _count: {
      clients: clients.length,
      assessments: assessmentsCount ?? 0,
    },
  };
}

export async function updateUserProfileViaSupabase(userId: string, data: { name: string }) {
  const { data: user, error } = await supabase
    .from('User')
    .update({
      name: data.name,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, name, email')
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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function chatPreviewText(content: string, prefix?: string) {
  const clean = normalizeWhitespace(String(content ?? ''));
  if (!clean) return prefix ?? 'Neuer Chat';
  const preview = clean.slice(0, 240);
  return prefix ? `${prefix}: ${preview}` : preview;
}

export function normalizeChatRow(chat: any) {
  const text = chat?.text ?? chat?.Text ?? chat?.lastMessage ?? chat?.last_message ?? null;
  return {
    ...chat,
    text,
    lastMessage: chat?.lastMessage ?? chat?.last_message ?? text,
    createdAt: chat?.createdAt ?? chat?.created_at,
  };
}

function isMissingTextColumn(error: any) {
  const message = String(error?.message ?? error?.details ?? '');
  return error?.code === 'PGRST204'
    || message.includes("'text'")
    || message.includes('"text"')
    || message.includes("'Text'")
    || message.includes('"Text"');
}

export async function listChatsViaSupabase(userId: string, assessmentId?: string | null) {
  let query = supabase
    .from('Chat')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });
  if (assessmentId) query = query.eq('assessmentId', assessmentId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeChatRow);
}

export async function createChatViaSupabase(userId: string, body: any) {
  const payload = {
    id: createId(),
    assessmentId: body?.assessment_id ?? null,
    clientId: body?.client_id ?? null,
    userId,
    title: body?.title ?? 'Neuer Chat',
    text: body?.text ?? body?.title ?? 'Neuer Chat',
    createdAt: new Date().toISOString(),
  };

  let result = await supabase
    .from('Chat')
    .insert(payload)
    .select('*')
    .single();

  if (result.error && isMissingTextColumn(result.error)) {
    const { text, ...payloadWithoutText } = payload;
    result = await supabase
      .from('Chat')
      .insert(payloadWithoutText)
      .select('*')
      .single();
  }

  if (result.error) throw result.error;
  return normalizeChatRow(result.data);
}

export async function findChatForUserViaSupabase(chatId: string, userId: string) {
  const { data, error } = await supabase
    .from('Chat')
    .select('*')
    .eq('id', chatId)
    .eq('userId', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeChatRow(data) : null;
}

export async function listMessagesViaSupabase(chatId: string, userId: string) {
  const chat = await findChatForUserViaSupabase(chatId, userId);
  if (!chat) return null;

  const { data, error } = await supabase
    .from('Message')
    .select('*')
    .eq('chatId', chatId)
    .order('createdAt', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMessageViaSupabase(chatId: string, role: string, content: string) {
  const { data, error } = await supabase
    .from('Message')
    .insert({
      id: createId(),
      chatId,
      role,
      content,
      createdAt: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateChatPreviewViaSupabase(chatId: string, text: string) {
  const payload = {
    text,
    last_message: text,
  };

  let result = await supabase
    .from('Chat')
    .update(payload)
    .eq('id', chatId)
    .select('*')
    .single();

  if (result.error && isMissingTextColumn(result.error)) {
    result = await supabase
      .from('Chat')
      .update({ last_message: text })
      .eq('id', chatId)
      .select('*')
      .single();
  }

  if (result.error) throw result.error;
  return normalizeChatRow(result.data);
}
