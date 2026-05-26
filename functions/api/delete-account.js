import { createClient } from '@supabase/supabase-js'

export async function onRequestPost(context) {
  const { request, env } = context

  const authHeader = request.headers.get('Authorization') || ''
  const jwt = authHeader.replace('Bearer ', '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }

  const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await anonClient.auth.getUser(jwt)
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }

  const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: files } = await adminClient.storage.from('recordings').list(user.id)
  if (files?.length) {
    const paths = files.map(f => `${user.id}/${f.name}`)
    await adminClient.storage.from('recordings').remove(paths)
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}
