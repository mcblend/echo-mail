export default {
  async scheduled(event, env, ctx) {
    // A plain SELECT wasn't enough to register as activity with Supabase's
    // inactivity check, so call touch_tic(), which UPDATEs a timestamp on
    // the single-row tic table (a real database write).
    const url = `${env.SUPABASE_URL}/rest/v1/rpc/touch_tic`
    console.log(`[echo-mail-keepalive] Calling touch_tic at ${url}`)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    if (res.ok) {
      const body = await res.text().catch(() => '')
      console.log(`[echo-mail-keepalive] Success — status ${res.status}, last_ping ${body}`)
    } else {
      const body = await res.text().catch(() => '')
      console.error(`[echo-mail-keepalive] Failed — status ${res.status}: ${body}`)
    }
  }
}
