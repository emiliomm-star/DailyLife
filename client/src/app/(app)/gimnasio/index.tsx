import { ModuloPendiente } from '@/components/modulo-pendiente';
import { textos } from '@/lib/textos';

export default function GimnasioScreen() {
  return <ModuloPendiente titulo={textos.dashboard.modulos.gimnasio.titulo} />;
}
