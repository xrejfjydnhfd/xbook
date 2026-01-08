// Backend helper for resumable video uploads.
//
// Purpose:
// - Provides a stable place to generate object keys / enforce auth for uploads.
// - Frontend still uploads directly to Storage (TUS) for true byte-based progress.
//
// This is the "backend equivalent" requested: it validates the user session and returns
// the upload endpoint + objectName so the frontend can upload chunks safely.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

function getProjectIdFromUrl(url: string) {
  // https://<projectId>.supabase.co
  const match = url.match(/^https?:\/\/([a-z0-9-]+)\./i);
  return match?.[1] ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const fileName: string = body?.fileName || "video.mp4";
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "mp4";

    // NOTE: objectName is returned (client will upload to this key)
    const objectName = `${user.id}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const projectId = getProjectIdFromUrl(supabaseUrl);
    const uploadEndpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;

    return json({
      bucketName: "media",
      objectName,
      uploadEndpoint,
      chunkSize: 6 * 1024 * 1024,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
});
