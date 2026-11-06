import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BibliotecaRutinas } from '@/components/biblioteca-rutinas';
import { ChipsOpciones } from '@/components/chips-opciones';
import { GimnasioHoy } from '@/components/gimnasio-hoy';
import { GimnasioPlan } from '@/components/gimnasio-plan';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { textos } from '@/lib/textos';

const t = textos.gimnasio;

type Pestana = 'hoy' | 'plan' | 'biblioteca';

/** Gimnasio: vista del día, plan semanal por persona y biblioteca de rutinas. */
export default function GimnasioScreen() {
  const [pestana, setPestana] = useState<Pestana>('hoy');

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Stack.Screen options={{ title: t.titulo }} />
      <View style={styles.columna}>
        <ChipsOpciones
          opciones={[
            { clave: 'hoy' as const, etiqueta: t.tabHoy, icono: 'today-outline' as const },
            { clave: 'plan' as const, etiqueta: t.tabPlan, icono: 'calendar-outline' as const },
            { clave: 'biblioteca' as const, etiqueta: t.tabBiblioteca, icono: 'library-outline' as const },
          ]}
          valor={pestana}
          onCambiar={setPestana}
          colorActivo="#4D96FF"
        />

        {pestana === 'hoy' && <GimnasioHoy />}
        {pestana === 'plan' && <GimnasioPlan />}
        {pestana === 'biblioteca' && <BibliotecaRutinas />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  columna: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
});
