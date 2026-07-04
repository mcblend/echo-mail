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

  // list() defaults to a max of 100 entries per call — page through
  // all of them so accounts with more recordings don't leave orphaned files
  let offset = 0
  const pageSize = 100
  while (true) {
    const { data: files } = await adminClient.storage
      .from('recordings')
      .list(user.id, { limit: pageSize, offset })
    if (!files?.length) break
    const paths = files.map(f => `${user.id}/${f.name}`)
    await adminClient.storage.from('recordings').remove(paths)
    if (files.length < pageSize) break
    offset += pageSize
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
