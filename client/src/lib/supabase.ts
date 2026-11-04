import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Expo inyecta las variables EXPO_PUBLIC_* en tiempo de build (desde client/.env.local en local).
// Deben escribirse literalmente así para que el bundler las sustituya.
// trim(): espacios o saltos de línea accidentales en .env.local llegan como cabecera apikey vacía.
// Si la URL llega con /rest/v1 o /auth/v1 al final, se quita: la librería ya añade esas rutas.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '');
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

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
  global: {
    // Cabecera apikey explícita en todas las peticiones.
    headers: { apikey: supabasePublishableKey },
  },
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
