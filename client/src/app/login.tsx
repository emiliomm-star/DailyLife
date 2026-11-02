import { router } from 'expo-router';
import { useState } from 'react';

import { Boton, Campo, Mensaje, Pantalla } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { textos, traducirError } from '@/lib/textos';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setError(null);
    setCargando(true);
    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: contrasena,
    });
    setCargando(false);
    // Si todo va bien, el AuthProvider detecta la sesión y el layout cambia de pantalla.
    if (errorLogin) setError(traducirError(errorLogin.message));
  }

  return (
    <Pantalla>
      <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
        {textos.login.titulo}
      </ThemedText>

      <Campo
        etiqueta={textos.login.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Campo
        etiqueta={textos.login.contrasena}
        value={contrasena}
        onChangeText={setContrasena}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={entrar}
      />

      {error && <Mensaje texto={error} />}

      <Boton titulo={textos.login.entrar} onPress={entrar} cargando={cargando} />

      <Boton
        titulo={textos.login.sinCuenta}
        onPress={() => router.push('/registro')}
        secundario
      />
    </Pantalla>
  );
}
