import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Boton, Campo, Mensaje, Pantalla } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { crearGrupo, unirseAGrupo } from '@/lib/grupos';
import { textos, traducirError } from '@/lib/textos';

export default function GrupoScreen() {
  const { recargarGrupo, cerrarSesion } = useAuth();
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState<'crear' | 'unirse' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar(accion: 'crear' | 'unirse') {
    setError(null);
    setCargando(accion);
    try {
      if (accion === 'crear') {
        await crearGrupo(nombre);
      } else {
        await unirseAGrupo(codigo);
      }
      // Recarga el grupo: el layout pasa a la app.
      await recargarGrupo();
    } catch (e) {
      setError(traducirError(e instanceof Error ? e.message : ''));
    } finally {
      setCargando(null);
    }
  }

  return (
    <Pantalla>
      <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
        {textos.grupo.titulo}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {textos.grupo.descripcion}
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.tarjeta}>
        <ThemedText type="smallBold">{textos.grupo.crearTitulo}</ThemedText>
        <Campo
          etiqueta={textos.grupo.nombreGrupo}
          value={nombre}
          onChangeText={setNombre}
          onSubmitEditing={() => enviar('crear')}
        />
        <Boton
          titulo={textos.grupo.crear}
          onPress={() => enviar('crear')}
          cargando={cargando === 'crear'}
        />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.tarjeta}>
        <ThemedText type="smallBold">{textos.grupo.unirseTitulo}</ThemedText>
        <Campo
          etiqueta={textos.grupo.codigo}
          value={codigo}
          onChangeText={(texto) => setCodigo(texto.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={() => enviar('unirse')}
        />
        <Boton
          titulo={textos.grupo.unirme}
          onPress={() => enviar('unirse')}
          cargando={cargando === 'unirse'}
        />
      </ThemedView>

      {error && <Mensaje texto={error} />}

      <Boton titulo={textos.general.cerrarSesion} onPress={cerrarSesion} secundario />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: Spacing.three,
    gap: Spacing.two + Spacing.one,
    padding: Spacing.three,
  },
});
