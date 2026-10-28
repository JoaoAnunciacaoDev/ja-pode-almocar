/// <reference lib="webworker" />

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Já pode almoçar?",
      body: event.data.text(),
    };
  }

  const title = payload.title || "Já pode almoçar?";
  const options = {
    body: payload.body || "Você tem uma nova notificação do seu grupo.",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    data: {
      url: payload.url || "/",
    },
    tag: payload.tag || "ja-pode-almocar-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.warn("Falha ao exibir notificação com opções padrão, tentando fallback simplificado:", err);
      return self.registration.showNotification(title, {
        body: options.body,
        data: options.data,
        tag: options.tag,
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.url || "/";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if (client.url !== targetUrl && "navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
