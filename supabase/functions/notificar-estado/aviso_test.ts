import { assertEquals } from 'jsr:@std/assert@1';
import { construirAviso, destinatariosDelAviso } from './aviso.ts';

Deno.test('el aviso dice quién cambió a qué estado', () => {
  assertEquals(construirAviso('Sindy', 'Ya llegué al trabajo').body, 'Sindy cambió a Ya llegué al trabajo');
});

Deno.test('sin nombre o sin estado usa textos de respaldo', () => {
  assertEquals(construirAviso(null, null).body, 'Alguien del grupo cambió a otro estado');
  assertEquals(construirAviso('  ', 'Salí').body, 'Alguien del grupo cambió a Salí');
});

Deno.test('avisa a los demás miembros, no a quien cambia', () => {
  const miembros = [
    { user_id: 'emilio', nombre: 'Emilio' },
    { user_id: 'sindy', nombre: 'Sindy' },
    { user_id: 'tercero', nombre: 'Tercero' },
  ];
  assertEquals(destinatariosDelAviso(miembros, 'sindy', new Set()), ['emilio', 'tercero']);
});

Deno.test('respeta la privacidad: no avisa a quien tiene oculto el módulo estados', () => {
  const miembros = [
    { user_id: 'emilio', nombre: 'Emilio' },
    { user_id: 'tercero', nombre: 'Tercero' },
  ];
  assertEquals(destinatariosDelAviso(miembros, 'sindy', new Set(['emilio'])), ['tercero']);
});
