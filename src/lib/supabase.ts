const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export interface SupabaseInsertResult {
  ok: boolean
  skipped: boolean
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export async function insertSupabaseRow(
  tableName: string,
  row: Record<string, unknown>,
): Promise<SupabaseInsertResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, skipped: true }
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    })

    return { ok: response.ok, skipped: false }
  } catch {
    return { ok: false, skipped: false }
  }
}
