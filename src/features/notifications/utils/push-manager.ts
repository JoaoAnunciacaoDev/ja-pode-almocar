export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.error("Falha ao registrar Service Worker:", error);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error("Seu navegador não suporta notificações push.");
  }

  if (!vapidPublicKey) {
    throw new Error("Chave pública VAPID não configurada (VITE_VAPID_PUBLIC_KEY).");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("A permissão para notificações foi recusada no navegador.");
  }

  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
  return await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey as unknown as BufferSource,
  });
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    return await subscription.unsubscribe();
  } catch {
    return false;
  }
}
