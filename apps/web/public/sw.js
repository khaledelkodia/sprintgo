/* SprintGo service worker — receives Web Push and opens the relevant screen. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'سبرنت جو', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'سبرنت جو';
  const options = {
    body: data.body || '',
    dir: 'rtl',
    lang: 'ar',
    tag: (data.data && data.data.orderId) || undefined, // collapse repeats per order
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data && event.notification.data.orderId;
  const url = orderId ? '/orders/' + orderId : '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
