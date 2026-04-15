

// echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import { getAuthToken } from './services/authApi';


// @ts-ignore
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
}

let echoInstance: any = null;
let lastToken: string | null = null;

export async function getEchoInstance() {
  const token = await getAuthToken();

  if (!token) {
    console.error('[Echo] ❌ No authentication token found in storage. Please login again.');
    throw new Error('No authentication token found');
  }

  // Only recreate if token changed or instance doesn't exist
  if (echoInstance && lastToken === token) {
    console.log('[Echo] Reusing existing Echo instance');
    return echoInstance;
  }

  if (echoInstance) {
    console.log('[Echo] Token changed, destroying old instance...');
    destroyEchoInstance();
  }

  lastToken = token;
  console.log('[Echo] Creating new Echo instance with fresh token...');

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: '443c8c0a97a80fc51fe8',
    cluster: 'ap2',
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    activityTimeout: 120000, // Increase to 2 minutes for mobile stability
    pongTimeout: 30000,      // Increase pong timeout
    authorizer: (channel: any) => {
      return {
        authorize: (socketId: string, callback: Function) => {
          fetch('https://apis.staffoo.com.au/broadcasting/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          })
            .then(async (res) => {
              const data = await res.json();
              if (!res.ok) {
                console.error('[Echo] Auth failed (response not ok):', res.status, data);
                return callback(true, data);
              }
              console.log(`[Echo] Auth successful for ${channel.name}`);
              callback(false, data);
            })
            .catch((err) => {
              console.error('[Echo] Auth error (fetch catch):', err);
              callback(true, err);
            });
        },
      };
    },
  });

  // Logging
  const connection = echoInstance.connector.pusher.connection;

  connection.bind('connected', () => 
    console.log('%c✅ Pusher Connected Successfully', 'color:#22C55E;font-weight:bold')
  );
  connection.bind('disconnected', () => 
    console.log('%c❌ Pusher Disconnected', 'color:#EF4444')
  );
  connection.bind('error', (err: any) => {
    const code = err?.data?.code;
    const type = err?.type;

    // Suppress common transient mobile network errors from console.error
    if (type === 'WebSocketError' || code === 1006) {
      console.warn(`[Echo] Connection transient error (${type || code}). Pusher will auto-retry.`);
    } else {
      console.error('[Echo] Pusher Fatal Error:', err);
    }
  });

  return echoInstance;
}


export function destroyEchoInstance() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {}
    echoInstance = null;
    lastToken = null;
    console.log('[Echo] Instance destroyed');
  }
}