import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';

import { nombreIcono } from '@/lib/estados-visual';

type EstadoIconoProps = {
  /** Clave del icono guardada en el estado. Si no es de la lista (p. ej. un emoji antiguo), se muestra como texto. */
  clave: string;
  color: string;
  tamano?: number;
};

/** Icono vectorial de un estado. Ligero: solo dibuja un glifo de fuente, sin imágenes. */
export function EstadoIcono({ clave, color, tamano = 28 }: EstadoIconoProps) {
  const nombre = nombreIcono(clave);
  if (nombre) {
    return <Ionicons name={nombre} size={tamano} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
  }
  return <Text style={{ fontSize: tamano }}>{clave}</Text>;
}
