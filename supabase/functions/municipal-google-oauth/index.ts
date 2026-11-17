import { createDatabase } from '../../../integration/worker.mjs';
import { handleGoogleOAuth } from '../../../integration/google-oauth.mjs';

const env = (name: string) => Deno.env.get(name) || '';
Deno.serve(request => handleGoogleOAuth(request, {
  env,
  db: createDatabase(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}));
