self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'StudyFlow', body: 'You have a new reminder' };
  }

  const title = data.title || 'StudyFlow';
  const options = {
    body: data.body || 'Time to study',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data || { url: '/agenda' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/agenda';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If not, open new window
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});