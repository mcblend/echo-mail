import { createClient } from '@supabase/supabase-js'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const authHeader = event.headers.authorization || ''
  const jwt = authHeader.replace('Bearer ', '')
  if (!jwt) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }

  // Verify the user's JWT with the anon client
  const anonClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )
  const { data: { user }, error: userError } = await anonClient.auth.getUser(jwt)
  if (userError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session' }) }
  }

  // Use service role to delete the user and all their data
  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Delete all storage objects for this user
  const { data: files } = await adminClient.storage
    .from('recordings')
    .list(user.id)
  if (files?.length) {
    const paths = files.map(f => `${user.id}/${f.name}`)
    await adminClient.storage.from('recordings').remove(paths)
  }

  // Delete the auth user — cascades to profiles and recordings via FK
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return { statusCode: 500, body: JSON.stringify({ error: deleteError.message }) }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
