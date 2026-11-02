import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Expo inyecta las variables EXPO_PUBLIC_* en tiempo de build (desde client/.env.local en local).
// Deben escribirse literalmente así para que el bundler las sustituya.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Revisa client/.env.local.',
  );
}

/**
 * Cliente único de Supabase para toda la app (web, iOS y Android).
 * - En móvil, la sesión se guarda con AsyncStorage.
 * - En web, supabase-js usa localStorage por defecto y procesa el enlace de login al volver del email.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
