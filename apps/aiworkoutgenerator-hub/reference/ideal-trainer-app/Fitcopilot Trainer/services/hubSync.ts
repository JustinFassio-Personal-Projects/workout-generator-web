import { supabase } from './dbService';

/**
 * Syncs the user's basic profile information to the central Hub 'user_profiles' table.
 * This ensures that the Hub (and other spokes) have the latest user data.
 */
export async function syncProfileToHub(user: { id: string; email?: string }) {
  if (!user || !user.id) return;

  // Only attempt sync if we have a valid supabase client
  if (!supabase) {
    console.warn('Supabase client not initialized, skipping Hub sync.');
    return;
  }

  try {
    console.log('🔄 Syncing profile to Hub for user:', user.id);

    // We only sync the ID and email for now, as other fields are managed by the Hub
    // Using upsert to handle both new users and updates
    // Note: profiles is in the public schema (shared across Hub and all apps)
    const { error } = await supabase.schema('public').from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      },
    );

    if (error) {
      // If the table doesn't exist (e.g. standalone mode without shared schema), we might get an error
      // We log it but don't crash the app
      if (error.code === '42P01' || error.code === 'PGRST204') {
        // undefined_table or schema not found
        console.warn(
          '⚠️ Hub profiles table not found. Skipping sync. (Table will be created by Hub app)',
        );
      } else {
        console.warn('⚠️ Failed to sync profile to Hub:', error.message || error.code);
      }
    } else {
      console.log('✅ Profile synced to Hub successfully.');
    }
  } catch (err) {
    console.error('❌ Unexpected error syncing to Hub:', err);
  }
}
