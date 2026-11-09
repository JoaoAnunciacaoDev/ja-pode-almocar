/// <reference lib="webworker" />

const CACHE_NAME = "ja-pode-almocar-v1";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("Falha ao pré-armazenar alguns recursos do cache:", err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só lida com requisições GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Não intercepta requisições para origens externas (ex: Supabase, APIs, extensões)
  if (url.origin !== self.location.origin) return;

  // Ignora rotas e scripts internos do Vite em ambiente de desenvolvimento
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.includes("/node_modules/") ||
    url.pathname.includes("vite")
  ) {
    return;
  }

  // Requisições de navegação (HTML / rotas da SPA): Network-first com fallback para index.html offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(req);
          if (cachedResponse) return cachedResponse;
          const fallback = await caches.match("/index.html");
          return fallback || Response.error();
        }),
    );
    return;
  }

  // Recursos estáticos (assets, imagens, css, js, fontes): Cache-first com fallback na rede
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Para arquivos com hash em /assets/, o cache é permanente.
        // Para outros recursos, revalida em segundo plano (stale-while-revalidate).
        if (!url.pathname.startsWith("/assets/")) {
          fetch(req)
            .then((networkResponse) => {
              if (
                networkResponse &&
                networkResponse.status === 200 &&
                networkResponse.type === "basic"
              ) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback silencioso em falha de rede
          return Response.error();
        });
    }),
  );
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
