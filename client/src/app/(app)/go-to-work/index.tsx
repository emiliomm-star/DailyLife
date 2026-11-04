import { ModuloPendiente } from '@/components/modulo-pendiente';
import { textos } from '@/lib/textos';

export default function GoToWorkScreen() {
  return <ModuloPendiente titulo={textos.dashboard.modulos.goToWork.titulo} />;
}
