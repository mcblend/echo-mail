export default {
  async scheduled(event, env, ctx) {
    const url = `${env.SUPABASE_URL}/rest/v1/tic?select=id&limit=1`
    console.log(`[echo-mail-keepalive] Pinging Supabase tic table at ${url}`)

    const res = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    })

    if (res.ok) {
      console.log(`[echo-mail-keepalive] Success — status ${res.status}`)
    } else {
      const body = await res.text().catch(() => '')
      console.error(`[echo-mail-keepalive] Failed — status ${res.status}: ${body}`)
    }
  }
}
