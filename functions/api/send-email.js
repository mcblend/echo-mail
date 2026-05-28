import { Resend } from 'resend'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export async function onRequestPost(context) {
  const { request, env } = context

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { to, title, duration, playbackUrl } = body

  if (!to || !title || !playbackUrl) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const durationLabel = formatDuration(duration || 0)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Voice Memo is Ready</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#131c2b;border-radius:16px;border:1px solid #1e2d40;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #1e2d40;">
              <img src="https://echo-mail.app/icons/icon-192.png" width="56" height="56" alt="Echo Mail" style="border-radius:50%;display:block;margin:0 auto 12px;" />
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#e2eaf4;letter-spacing:-0.3px;">Echo Mail</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:14px;color:#4a6a8a;text-transform:uppercase;letter-spacing:0.5px;">Your voice memo is ready</p>
              <h2 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#e2eaf4;">${title}</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;border-radius:10px;border:1px solid #1e2d40;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:12px;color:#4a6a8a;display:block;margin-bottom:4px;">Duration</span>
                    <span style="font-size:16px;font-weight:600;color:#e2eaf4;">${durationLabel}</span>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${playbackUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#e8734a,#c0392b);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:50px;letter-spacing:0.2px;">
                      Listen to Recording
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:12px;color:#4a6a8a;text-align:center;line-height:1.6;">
                Or copy this link:<br/>
                <a href="${playbackUrl}" style="color:#7ab0e0;word-break:break-all;">${playbackUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e2d40;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4a6a8a;">Sent via <strong style="color:#7ab0e0;">Echo Mail</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const resend = new Resend(env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to,
      subject: 'Your Voice Memo is Ready',
      html,
    })
    return new Response(JSON.stringify({ success: true, id: result.data?.id }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to send email' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
