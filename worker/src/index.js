export default {
  async scheduled(event, env, ctx) {
    const url = `${env.SUPABASE_URL}/rest/v1/`
    console.log(`[echo-mail-keepalive] Pinging Supabase at ${url}`)

    const res = await fetch(url)

    if (res.ok) {
      console.log(`[echo-mail-keepalive] Success — status ${res.status}`)
    } else {
      console.error(`[echo-mail-keepalive] Unexpected status ${res.status}`)
    }
  }
}
