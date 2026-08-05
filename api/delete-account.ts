import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xsefgwhywcuzfnawtyru.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZWZnd2h5d2N1emZuYXd0eXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzMxMDEsImV4cCI6MjA4MDEwOTEwMX0._ZxWGsoU-rN8Yuf_v_7zGrivk2GKgb6QHBbT3QgtrCk';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const getBearerToken = (request: any) => {
  const header = String(request.headers?.authorization || '').trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
};

const removeInChunks = async (client: any, bucket: string, paths: string[]) => {
  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100);
    if (!chunk.length) continue;
    const { error } = await client.storage.from(bucket).remove(chunk);
    if (error) throw error;
  }
};

const deleteContactMessagesForEmail = async (client: any, email?: string) => {
  if (!email) return;
  const { error } = await client.from('contact_messages').delete().eq('email', email);
  if (error) throw error;
};

const listFilesRecursively = async (client: any, bucket: string, prefix: string): Promise<string[]> => {
  const files: string[] = [];
  const pending = [prefix];

  while (pending.length) {
    const current = pending.pop() as string;
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data, error } = await client.storage.from(bucket).list(current, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      for (const item of data || []) {
        const path = `${current}/${item.name}`;
        if (item.id || item.metadata) files.push(path);
        else pending.push(path);
      }

      if (!data || data.length < limit) break;
      offset += limit;
    }
  }

  return files;
};

export default async function handler(request: any, response: any) {
  response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(503).json({ error: 'Secure account deletion is not configured.' });
  }

  const token = getBearerToken(request);
  if (!token) return response.status(401).json({ error: 'Authentication required.' });

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResult, error: userError } = await authClient.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user) return response.status(401).json({ error: 'Your session is no longer valid.' });

  try {
    const [worksheetFiles, gameFiles, ownedSchoolsResult] = await Promise.all([
      listFilesRecursively(adminClient, 'worksheet-assets', `worksheets/${user.id}`),
      listFilesRecursively(adminClient, 'worksheet-assets', `games/${user.id}`),
      adminClient.from('schools').select('id, logo_storage_path').eq('owner_user_id', user.id),
    ]);

    if (ownedSchoolsResult.error) throw ownedSchoolsResult.error;
    const ownedSchools = ownedSchoolsResult.data || [];
    const schoolIds = ownedSchools.map((school: any) => school.id).filter(Boolean);
    const schoolLogoPaths = ownedSchools.map((school: any) => school.logo_storage_path).filter(Boolean);

    let schoolStoragePaths: string[] = [];
    if (schoolIds.length) {
      const schoolFilesResult = await adminClient
        .from('school_storage_files')
        .select('storage_path')
        .in('school_id', schoolIds);
      if (schoolFilesResult.error) throw schoolFilesResult.error;
      schoolStoragePaths = (schoolFilesResult.data || []).map((file: any) => file.storage_path).filter(Boolean);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const cancellation = await userClient.rpc('cancel_my_account');
    if (cancellation.error) {
      return response.status(409).json({ error: cancellation.error.message || 'The account could not be deleted.' });
    }

    const cleanupResults = await Promise.allSettled([
      removeInChunks(adminClient, 'worksheet-assets', [...worksheetFiles, ...gameFiles, ...schoolLogoPaths]),
      removeInChunks(adminClient, 'school-storage', schoolStoragePaths),
      deleteContactMessagesForEmail(adminClient, user.email),
    ]);
    const cleanupFailed = cleanupResults.some((result) => result.status === 'rejected');
    if (cleanupFailed) {
      console.error('Account database record was deleted, but one or more storage cleanups failed.', {
        userId: user.id,
        failures: cleanupResults
          .filter((result) => result.status === 'rejected')
          .map((result: any) => String(result.reason?.message || result.reason || 'Unknown cleanup error')),
      });
    }

    return response.status(200).json({ success: true, cleanupPending: cleanupFailed });
  } catch (error) {
    console.error('Secure account deletion failed.', {
      userId: user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return response.status(500).json({ error: 'The account could not be deleted safely. Please contact support.' });
  }
}
