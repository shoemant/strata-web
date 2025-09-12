// supabase/functions/ingest-user-csv/index.ts
// Deno Edge Function to parse a user CSV from Storage and upsert user_profiles.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Summary = {
  ok: boolean;
  buildingId?: string;
  processed?: number;
  createdAuth?: number;
  inserted?: number;
  updated?: number;
  errors?: Array<{ row: number; msg: string }>;
  error?: string;
};

const BUCKET = "user_imports";
const ALLOWED_ROLES = new Set(["manager", "owner", "tenant", "admin"]);

function cors(res: Response) {
  return new Response(res.body, {
    ...res,
    headers: {
      ...res.headers,
      "Access-Control-Allow-Origin": "*",           // allow all origins (for dev)
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

serve(async (req) => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // @ts-ignore
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (req.method === "OPTIONS") {
    return cors(new Response("ok", { status: 200 }));
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return cors(new Response(JSON.stringify({ ok: false, error: "Missing function secrets" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    }));
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    if (req.method !== "POST") {
      return cors(new Response("Method Not Allowed", { status: 405 }));
    }

    const body = await req.json().catch(() => ({}));
    const path: string | undefined = body?.path;
    const createAuthIfMissing: boolean = Boolean(body?.create_auth_if_missing);

    if (!path || typeof path !== "string") {
      return cors(new Response(JSON.stringify({ ok: false, error: "Missing 'path' string in body" }), {
        status: 400, headers: { "content-type": "application/json" },
      }));
    }

    // Expect "<buildingId>/<filename>"
    const [buildingId] = path.split("/");
    if (!buildingId || buildingId.length < 10) {
      return cors(new Response(JSON.stringify({ ok: false, error: "Invalid path; cannot parse buildingId" }), {
        status: 400, headers: { "content-type": "application/json" },
      }));
    }

    // Download CSV
    const dl = await admin.storage.from(BUCKET).download(path);
    if (dl.error) {
      console.error("Download error:", dl.error.message);
      return cors(new Response(JSON.stringify({ ok: false, error: `Download error: ${dl.error.message}` }), {
        status: 400, headers: { "content-type": "application/json" },
      }));
    }
    const csvText = await dl.data.text();
    const rows = parse(csvText, { skipFirstRow: false }) as string[][];
    if (!rows.length) {
      return cors(new Response(JSON.stringify({ ok: false, error: "Empty CSV" }), {
        status: 400, headers: { "content-type": "application/json" },
      }));
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    const idx = {
      full_name: col("full_name"),
      email: col("email"),
      role: col("role"),
      unit_id: col("unit_id"),
      unit_number: col("unit_number"),
    };
    if (idx.email === -1 || idx.role === -1) {
      return cors(new Response(JSON.stringify({ ok: false, error: "CSV must contain 'email' and 'role' headers" }), {
        status: 400, headers: { "content-type": "application/json" },
      }));
    }

    let processed = 0;
    let createdAuth = 0;
    let inserted = 0;
    let updated = 0;
    const errors: Array<{ row: number; msg: string }> = [];

    // optional FK sanity: log if building not found (won't block, just helps)
    const { data: buildingExists, error: bErr } = await admin
      .from("buildings")
      .select("id")
      .eq("id", buildingId)
      .maybeSingle();
    if (bErr) console.error("Building lookup error:", bErr.message);
    if (!buildingExists?.id) console.warn("Warning: buildingId not found; upserts may fail FK.");

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every((x) => (x ?? "").trim() === "")) continue;

      const rowNo = i + 1;
      const email = (r[idx.email] ?? "").trim().toLowerCase();
      const role = (r[idx.role] ?? "").trim().toLowerCase();
      const full_name = idx.full_name >= 0 ? (r[idx.full_name] ?? "").trim() : null;
      let unit_id = idx.unit_id >= 0 ? (r[idx.unit_id] ?? "").trim() : "";
      const unitNumber = idx.unit_number >= 0 ? (r[idx.unit_number] ?? "").trim() : "";

      console.log(`[row ${rowNo}] email=${email} role=${role} unit_id=${unit_id || "-"} unit_number=${unitNumber || "-"}`);

      if (!email) {
        errors.push({ row: rowNo, msg: "Missing email" });
        continue;
      }
      if (!ALLOWED_ROLES.has(role)) {
        errors.push({ row: rowNo, msg: `Invalid role '${role}'` });
        continue;
      }

      // Find or create auth user
      let authId: string | null = null;
      const { data: byEmail, error: getUserErr } = await admin.auth.admin.getUserByEmail(email);
      if (getUserErr) console.error(`[row ${rowNo}] getUserByEmail error:`, getUserErr.message);

      if (byEmail?.user) {
        authId = byEmail.user.id;
      } else if (createAuthIfMissing) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: false,
          user_metadata: full_name ? { full_name } : undefined,
        });
        if (createErr || !created?.user) {
          const msg = `Auth create failed: ${createErr?.message ?? "unknown"}`;
          console.error(`[row ${rowNo}] ${msg}`);
          errors.push({ row: rowNo, msg });
          continue;
        }
        authId = created.user.id;
        createdAuth++;
      } else {
        const msg = "Auth user not found and create_auth_if_missing=false";
        console.warn(`[row ${rowNo}] ${msg}`);
        errors.push({ row: rowNo, msg });
        continue;
      }

      // Resolve unit_id via unit_number if not provided
      if (!unit_id && unitNumber) {
        const { data: u, error: uErr } = await admin
          .from("units")
          .select("id, number, unit_number, building_id")
          .eq("building_id", buildingId)
          .or(`number.eq.${unitNumber},unit_number.eq.${unitNumber}`)
          .maybeSingle();
        if (uErr) console.error(`[row ${rowNo}] unit lookup error:`, uErr.message);
        if (u?.id) unit_id = u.id;
      }

      // Does profile already exist?
      const { data: existing, error: exErr } = await admin
        .from("user_profiles")
        .select("id")
        .eq("id", authId)
        .maybeSingle();
      if (exErr) console.error(`[row ${rowNo}] existing lookup error:`, exErr.message);

      // Upsert profile
      const upsertRow: Record<string, unknown> = {
        id: authId,
        email,
        full_name,
        role,
        building_id: buildingId,
        unit_id: unit_id || null,
      };

      const { error: upErr } = await admin
        .from("user_profiles")
        .upsert(upsertRow, { onConflict: "id" });

      if (upErr) {
        const msg = `Upsert failed: ${upErr.message}`;
        console.error(`[row ${rowNo}] ${msg}`);
        errors.push({ row: rowNo, msg });
        continue;
      }

      if (existing?.id) {
        updated++;
        console.log(`[row ${rowNo}] updated profile for ${email}`);
      } else {
        inserted++;
        console.log(`[row ${rowNo}] inserted profile for ${email}`);
      }

      processed++;
    }

    const summary: Summary = {
      ok: true,
      buildingId,
      processed,
      createdAuth,
      inserted,
      updated,
      errors,
    };

    return cors(new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  } catch (e) {
    console.error("Unhandled error:", e);
    return cors(new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    }));
  }
});
