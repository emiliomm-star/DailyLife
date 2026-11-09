// Service worker de DailyLife: muestra los avisos push y, al tocarlos, abre la app.

self.addEventListener('push', (evento) => {
  let datos = { title: 'DailyLife', body: '', url: '/' };
  try {
    datos = { ...datos, ...evento.data.json() };
  } catch {
    // Aviso sin JSON válido: se muestra con los textos por defecto.
  }
  evento.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: datos.url },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = evento.notification.data?.url || '/';
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const ventana = ventanas.find((v) => 'focus' in v);
      if (ventana) {
        ventana.navigate(url);
        return ventana.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
