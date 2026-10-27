declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "web-push-neo" {
  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }
  export interface VapidDetails {
    subject: string;
    publicKey: string;
    privateKey: string;
  }
  export interface SendNotificationOptions {
    vapidDetails?: VapidDetails;
    TTL?: number;
    urgency?: "very-low" | "low" | "normal" | "high";
    headers?: Record<string, string>;
  }
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | null,
    options?: SendNotificationOptions,
  ): Promise<Response>;
}
