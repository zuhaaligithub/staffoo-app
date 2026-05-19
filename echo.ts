// // echo.ts
// import Echo from 'laravel-echo';
// import Pusher from 'pusher-js/react-native';
// import { getAuthToken } from './services/authApi';

// const PusherClient =
//   (Pusher as any)?.default || (Pusher as any)?.Pusher || Pusher;

// let echoInstance: any = null;
// let lastToken: string | null = null;

// export async function getEchoInstance() {
//   const token = await getAuthToken();

//   if (!token) {
//     console.error('[Echo] ❌ No authentication token found');
//     throw new Error('No authentication token found');
//   }

//   console.log('[Echo] 🔑 auth token found, creating Echo instance');
//   console.log(
//     '[Echo] 🔧 Pusher client type:',
//     typeof PusherClient,
//     'name:',
//     (PusherClient as any)?.name,
//   );

//   if (echoInstance && lastToken === token) {
//     console.log('[Echo] ✅ Reusing existing Echo instance');
//     return echoInstance;
//   }

//   if (echoInstance) {
//     console.log('[Echo] 🔄 Token changed, destroying old instance');
//     destroyEchoInstance();
//   }

//   lastToken = token;
//   console.log('[Echo] 🆕 Creating new Echo instance');

//   try {
//     echoInstance = new Echo({
//       broadcaster: 'pusher',
//       key: '443c8c0a97a80fc51fe8',
//       cluster: 'ap2',
//       forceTLS: true,
//       encrypted: true,
//       disableStats: true,
//       enabledTransports: ['ws', 'wss'],
//       wsHost: 'ws-ap2.pusher.com',
//       wssPort: 443,
//       wsPort: 80,
//       activityTimeout: 120000,
//       pongTimeout: 30000,
//       // Use Pusher constructor for React Native
//       client: PusherClient,
//       authorizer: (channel: any) => {
//         return {
//           authorize: (socketId: string, callback: Function) => {
//             fetch('https://apis.staffoo.com.au/broadcasting/auth', {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//                 Authorization: `Bearer ${token}`,
//                 Accept: 'application/json',
//               },
//               body: JSON.stringify({
//                 socket_id: socketId,
//                 channel_name: channel.name,
//               }),
//             })
//               .then(async res => {
//                 const data = await res.json();
//                 if (!res.ok) {
//                   console.error('[Echo] ❌ Auth failed:', res.status, data);
//                   return callback(true, data);
//                 }
//                 console.log(`[Echo] ✅ Auth successful for ${channel.name}`);
//                 callback(false, data);
//               })
//               .catch(err => {
//                 console.error('[Echo] ❌ Auth error:', err);
//                 callback(true, err);
//               });
//           },
//         };
//       },
//     });

//     // Connection event listeners
//     const connection = echoInstance.connector?.pusher?.connection;
//     console.log(
//       '[Echo] ℹ️ Connector ready:',
//       !!echoInstance.connector,
//       'Pusher ready:',
//       !!echoInstance.connector?.pusher,
//       'Connection ready:',
//       !!connection,
//     );
//     if (connection) {
//       connection.bind('connected', () => {
//         console.log('[Echo] ✅ Pusher Connected');
//       });

//       connection.bind('connecting', () => {
//         console.log('[Echo] ⏳ Pusher Connecting');
//       });

//       connection.bind('failed', () => {
//         console.warn('[Echo] ❌ Pusher Connection Failed');
//       });

//       connection.bind('disconnected', () => {
//         console.log('[Echo] ❌ Pusher Disconnected');
//       });

//       connection.bind('state_change', (states: any) => {
//         console.log('[Echo] 🔄 Connection state change:', states);
//       });

//       connection.bind('error', (err: any) => {
//         const code = err?.data?.code;
//         const type = err?.type;

//         if (type === 'WebSocketError' || code === 1006) {
//           console.warn(`[Echo] ⚠️ Transient error (${type || code})`);
//         } else {
//           console.error('[Echo] ❌ Fatal Error:', err);
//         }
//       });

//       console.log('[Echo] ℹ️ Current connection state:', connection.state);
//     } else {
//       console.error('[Echo] ❌ Missing Pusher connection object');
//     }

//     console.log('[Echo] ✅ Echo instance created successfully');
//     return echoInstance;
//   } catch (error) {
//     console.error('[Echo] ❌ Failed to create Echo instance:', error);
//     throw error;
//   }
// }

// export function destroyEchoInstance() {
//   if (echoInstance) {
//     try {
//       echoInstance.disconnect();
//       console.log('[Echo] 🗑️ Instance destroyed');
//     } catch (e) {
//       console.error('[Echo] ❌ Error destroying instance:', e);
//     }
//     echoInstance = null;
//     lastToken = null;
//   }
// }

// echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import { getAuthToken } from './services/authApi';

// ---------------------------------------------------------------------------
// Resolve the real Pusher constructor from whatever pusher-js/react-native exports
// ---------------------------------------------------------------------------
function resolvePusherConstructor(): new (...args: any[]) => any {
  const candidates = [
    (Pusher as any)?.default,
    (Pusher as any)?.Pusher,
    Pusher,
  ];
  for (const c of candidates) {
    if (typeof c === 'function') {
      console.log(
        '[Echo] ✅ Resolved Pusher constructor:',
        c?.name || 'anonymous',
      );
      return c;
    }
  }
  throw new Error(
    '[Echo] ❌ Cannot resolve Pusher constructor from pusher-js/react-native',
  );
}

// ---------------------------------------------------------------------------
// Wait until pusherConnection.state === 'connected', or reject on failure/timeout
// ---------------------------------------------------------------------------
export function waitForConnection(
  pusherConnection: any,
  timeoutMs = 12000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pusherConnection?.state === 'connected') {
      resolve();
      return;
    }

    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(
        new Error(
          `[Echo] ⏱ Pusher connection timed out after ${timeoutMs}ms (state: ${pusherConnection?.state})`,
        ),
      );
    }, timeoutMs);

    function onConnected() {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    }
    function onFailed() {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error('[Echo] ❌ Pusher connection failed'));
    }
    function cleanup() {
      clearTimeout(timer);
      try {
        pusherConnection.unbind('connected', onConnected);
        pusherConnection.unbind('failed', onFailed);
      } catch (_) {}
    }

    pusherConnection.bind('connected', onConnected);
    pusherConnection.bind('failed', onFailed);
  });
}

// ---------------------------------------------------------------------------
// Module-level singletons
// ---------------------------------------------------------------------------
let echoInstance: any = null;
let lastToken: string | null = null;

// ---------------------------------------------------------------------------
// getEchoInstance
//
// KEY FIX: inject the Pusher constructor via global (global.Pusher) rather
// than the `client:` option.
//
// When you pass `client: somePusherInstance`, Echo's PusherConnector uses it
// as a pre-built object and skips its own `new Pusher(key, options)` call.
// The result is that connector.pusher IS the raw instance you passed, but its
// internal `.connection` state machine is never attached in the way Echo
// expects — so connector.pusher.connection ends up undefined.
//
// When you set global.Pusher = PusherConstructor instead, Echo does:
//   this.pusher = new Pusher(key, options)
// internally, which correctly wires connector.pusher AND
// connector.pusher.connection.
// ---------------------------------------------------------------------------
export async function getEchoInstance(): Promise<any> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('[Echo] No authentication token found');
  }

  // Reuse if token unchanged and instance still alive
  if (echoInstance && lastToken === token) {
    const state = echoInstance.connector?.pusher?.connection?.state;
    console.log('[Echo] ✅ Reusing existing Echo instance (state:', state, ')');
    return echoInstance;
  }

  if (echoInstance) {
    console.log('[Echo] 🔄 Token changed — destroying old instance');
    destroyEchoInstance();
  }

  // ✅ Inject via global so Echo calls `new Pusher(key, opts)` internally
  const PusherConstructor = resolvePusherConstructor();
  (global as any).Pusher = PusherConstructor;

  lastToken = token;
  console.log('[Echo] 🆕 Creating new Echo instance');

  try {
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: '443c8c0a97a80fc51fe8',
      cluster: 'ap2',
      forceTLS: true,
      encrypted: true,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      wsHost: 'ws-ap2.pusher.com',
      wssPort: 443,
      wsPort: 80,
      activityTimeout: 120000,
      pongTimeout: 30000,
      authorizer: (channel: any) => ({
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
            .then(async res => {
              const data = await res.json();
              if (!res.ok) {
                console.error('[Echo] ❌ Auth failed:', res.status, data);
                return callback(true, data);
              }
              console.log(`[Echo] ✅ Auth OK for ${channel.name}`);
              callback(false, data);
            })
            .catch(err => {
              console.error('[Echo] ❌ Auth network error:', err);
              callback(true, err);
            });
        },
      }),
    });

    // Verify the connection object is now properly wired
    const connector = echoInstance.connector;
    const pusher = connector?.pusher;
    const connection = pusher?.connection;

    console.log('[Echo] ℹ️ Connector ready:', !!connector);
    console.log('[Echo] ℹ️ Pusher ready:', !!pusher);
    console.log('[Echo] ℹ️ Connection object ready:', !!connection);

    if (!connection) {
      throw new Error(
        '[Echo] connector.pusher.connection is still undefined after global injection. ' +
          'Verify your pusher-js/react-native version (should be >=8.x).',
      );
    }

    // Bind lifecycle events
    connection.bind('connected', () =>
      console.log('[Echo] ✅ Pusher Connected'),
    );
    connection.bind('connecting', () =>
      console.log('[Echo] ⏳ Pusher Connecting'),
    );
    connection.bind('failed', () =>
      console.warn('[Echo] ❌ Pusher Connection Failed'),
    );
    connection.bind('disconnected', () =>
      console.log('[Echo] 🔌 Pusher Disconnected'),
    );
    connection.bind('state_change', (states: any) =>
      console.log('[Echo] 🔄 State:', states.previous, '→', states.current),
    );
    connection.bind('error', (err: any) => {
      const code = err?.data?.code;
      const type = err?.type;
      if (type === 'WebSocketError' || code === 1006) {
        console.warn(
          `[Echo] ⚠️ Transient error (${type || code}) — will auto-reconnect`,
        );
      } else {
        console.error('[Echo] ❌ Fatal connection error:', err);
      }
    });

    console.log('[Echo] ℹ️ Initial connection state:', connection.state);
    console.log('[Echo] ✅ Echo instance ready');
    return echoInstance;
  } catch (error) {
    console.error('[Echo] ❌ Failed to create Echo instance:', error);
    _safeDestroy();
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Internal safe destroy — won't throw even if pusher internals are broken
// ---------------------------------------------------------------------------
function _safeDestroy() {
  if (!echoInstance) return;
  try {
    echoInstance.disconnect();
  } catch (_) {
    try {
      echoInstance.connector?.pusher?.disconnect();
    } catch (_2) {
      // Give up silently — instance will be GC'd
    }
  }
  echoInstance = null;
  lastToken = null;
}

export function destroyEchoInstance() {
  if (echoInstance) {
    _safeDestroy();
    console.log('[Echo] 🗑️ Instance destroyed');
  }
}
