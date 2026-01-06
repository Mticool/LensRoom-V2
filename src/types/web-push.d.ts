declare module 'web-push' {
  interface VapidDetails {
    subject: string;
    publicKey: string;
    privateKey: string;
  }

  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    expirationTime?: number | null;
  }

  interface RequestOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
    vapidDetails?: VapidDetails;
    headers?: Record<string, string>;
    gcmAPIKey?: string;
    proxy?: string;
    agent?: any;
    timeout?: number;
  }

  interface SendResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }

  interface WebPushError extends Error {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    endpoint: string;
  }

  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  function setGCMAPIKey(apiKey: string): void;

  function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: RequestOptions
  ): Promise<SendResult>;

  function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };

  function encrypt(
    userPublicKey: string,
    userAuth: string,
    payload: string | Buffer,
    contentEncoding?: string
  ): {
    localPublicKey: string;
    salt: string;
    cipherText: Buffer;
  };

  function getVapidHeaders(
    audience: string,
    subject: string,
    publicKey: string,
    privateKey: string,
    contentEncoding: string,
    expiration?: number
  ): {
    Authorization: string;
    'Crypto-Key': string;
  };
}







