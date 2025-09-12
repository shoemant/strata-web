// supabase/functions/send-invite-email/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000' // fallback for local
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface Payload {
  invitation_id?: string
}

Deno.serve(async (req) => {
  try {
    const { invitation_id }: Payload = await req.json().catch(() => ({}))
    if (!invitation_id) {
      return new Response(JSON.stringify({ error: 'invitation_id required' }), { status: 400 })
    }

    // Load invitation + building + unit (optional)
    const { data: inv, error: invErr } = await supabase
      .from('invitations')
      .select(`
        id, email, role, token, building_id, unit_id, expires_at,
        buildings:building_id ( id, name ),
        units:unit_id ( id, label )
      `)
      .eq('id', invitation_id)
      .single()

    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), { status: 404 })
    }

    // Build accept URL
    const acceptUrl = `${SITE_URL.replace(/\/$/, '')}/join?token=${encodeURIComponent(inv.token)}`
    const buildingName = inv.buildings?.name ?? 'your building'
    const unitLabel = inv.units?.label ? ` (Unit ${inv.units.label})` : ''
    const subject = `You're invited to ${buildingName}${unitLabel}`

    // Basic HTML (keep it simple)
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

    // Send via Resend (optional – if key missing, just log)
    if (RESEND_API_KEY) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Strata <no-reply@${new URL(SITE_URL).hostname}>`,
          to: [inv.email],
          subject,
          html
        })
      })

      if (!resp.ok) {
        const txt = await resp.text()
        console.warn('Resend error:', txt)
        // still proceed to mark sent_at; you can choose to skip if send fails
      }
    } else {
      console.log('[send-invite-email] No RESEND_API_KEY set, skipping real send. Would send to:', inv.email)
    }

    // Mark as sent
    await supabase
      .from('invitations')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', inv.id)

    return new Response(JSON.stringify({ ok: true, invitation_id }), { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Unhandled error' }), { status: 500 })
  }
})
