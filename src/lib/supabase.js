import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function upsertProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRecordings(userId) {
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getRecordingById(id) {
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function insertRecording(recording) {
  const { data, error } = await supabase
    .from('recordings')
    .insert(recording)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecording(id, userId) {
  const rec = await getRecordingById(id)
  if (rec?.storage_path) {
    await supabase.storage.from('recordings').remove([rec.storage_path])
  }
  const { error } = await supabase
    .from('recordings')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function uploadAudio(userId, blob, filename) {
  const path = `${userId}/${filename}`
  const { data, error } = await supabase.storage
    .from('recordings')
    .upload(path, blob, { contentType: blob.type, upsert: false })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(path)
  return { path, publicUrl: urlData.publicUrl }
}
