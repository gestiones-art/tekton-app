import { createDatabase, runWorker } from '../../../integration/worker.mjs';

const env = (name: string, required = true) => {
  const value = Deno.env.get(name);
  if (required && !value) throw new Error('missing_configuration');
  return value || '';
};

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const expected = env('MUNICIPAL_WORKER_SECRET');
  if (request.headers.get('Authorization') !== `Bearer ${expected}`) return new Response(null, { status: 401 });
  try {
    const db = createDatabase(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
    return Response.json(await runWorker({ db, env }));
  } catch {
    return Response.json({ error: 'integration_run_failed' }, { status: 503 });
  }
});
