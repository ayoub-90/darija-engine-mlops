import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
    const { email, token, role } = await req.json()
    const url = `${Deno.env.get('SITE_URL')}/accept-invitation?token=${token}`

    // Utilise Resend, SendGrid, etc.
    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'noreply@ton-domaine.com',
            to: email,
            subject: `Invitation Darija Engine — Rôle : ${role}`,
            html: `<p>Accepte ton invitation : <a href="${url}">${url}</a></p>`,
        }),
    })

    return new Response(JSON.stringify({ ok: true }))
})