import { router } from 'expo-router';
import { useState } from 'react';

import { Boton, Campo, Mensaje, Pantalla } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { describirError, textos, type ErrorDescrito } from '@/lib/textos';

export default function RegistroScreen() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function crearCuenta() {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      const { data, error: errorRegistro } = await supabase.auth.signUp({
        email: email.trim(),
        password: contrasena,
      });

      if (errorRegistro) {
        setError(describirError(errorRegistro));
        return;
      }
      // Si la confirmación por email está activa, no hay sesión todavía.
      // En ese caso avisamos y el usuario entra después de confirmar.
      if (!data.session) {
        setAviso(textos.registro.revisaCorreo);
      }
      // Con sesión, el AuthProvider detecta el cambio y el layout pasa a la pantalla de grupo.
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla>
      <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
        {textos.registro.titulo}
      </ThemedText>

      <Campo
        etiqueta={textos.registro.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Campo
        etiqueta={textos.registro.contrasena}
        value={contrasena}
        onChangeText={setContrasena}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={crearCuenta}
      />

      {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
      {aviso && <ThemedText type="small" style={{ textAlign: 'center' }}>{aviso}</ThemedText>}

      <Boton titulo={textos.registro.crear} onPress={crearCuenta} cargando={cargando} />
      <Boton
        titulo={textos.registro.yaTengoCuenta}
        onPress={() => router.replace('/login')}
        secundario
      />
    </Pantalla>
  );
}
