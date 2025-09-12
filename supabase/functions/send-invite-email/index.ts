// supabase/functions/send-invite-email/index.ts
/// <reference types="jsr:@supabase/functions-js/edge-runtime" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---- Environment ----
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

// Admin client (bypasses RLS)
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type SendInvitePayload = {
  invitation_id?: string
}

// Whitelist origins (dev + prod). Add your prod domain here.
const ALLOWED_ORIGINS = new Set < string > ([
  'http://localhost:3000',
  // 'https://yourdomain.com',
])

function makeCorsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'http://localhost:3000'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const corsHeaders = makeCorsHeaders(origin)

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as SendInvitePayload
    const invitation_id = body?.invitation_id
    if (!invitation_id) {
      return new Response(JSON.stringify({ error: 'invitation_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load invitation + building + unit (server-side)
    const { data: inv, error: invErr } = await admin
      .from('invitations')
      .select(`
        id, email, role, token, building_id, unit_id, expires_at,
        buildings:building_id ( id, name ),
        units:unit_id ( id, label )
      `)
      .eq('id', invitation_id)
      .single()

    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const acceptUrl = `${SITE_URL.replace(/\/$/, '')}/join?token=${encodeURIComponent(inv.token)}`
    const buildingName = inv.buildings?.name ?? 'your building'
    const unitLabel = inv.units?.label ? ` (Unit ${inv.units.label})` : ''
    const subject = `You're invited to ${buildingName}${unitLabel}`

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
        <h2>You're invited</h2>
        <p>You have been invited as <strong>${inv.role}</strong> to <strong>${buildingName}</strong>${unitLabel}.</p>
        ${inv.expires_at ? `<p>This link expires on <strong>${new Date(inv.expires_at).toLocaleString()}</strong>.</p>` : ''}
        <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;border-radius:8px;text-decoration:none">Accept invitation</a></p>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p><a href="${acceptUrl}">${acceptUrl}</a></p>
      </div>
    `

    // Send email via Resend (optional)
    if (RESEND_API_KEY) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // TODO: Fix the email domain
          from: 'Strata App <onboarding@resend.dev>',
          to: [inv.email],
          subject,
          html,
        }),
      })

      if (!resp.ok) {
        const txt = await resp.text()
        console.warn('Resend error:', txt)
        // You can return 502 here if you want to signal failure; or continue.
      }
    } else {
      console.log('[send-invite-email] No RESEND_API_KEY set; skipping real send. Would send to:', inv.email)
    }

    // Mark as sent
    await admin.from('invitations')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', inv.id)

    return new Response(JSON.stringify({ ok: true, invitation_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Unhandled error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
