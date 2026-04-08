


// // echo.ts
// import Echo from 'laravel-echo';
// import Pusher from 'pusher-js/react-native';

// // @ts-ignore
// if (typeof window !== 'undefined') {
//   (window as any).Pusher = Pusher;
// }

// let echoInstance: any = null;

// export function getEchoInstance(token: string) {
//   if (!echoInstance) {
//     console.log('[Echo] Creating new Echo instance with Authorizer');

//     const pusherClient = new Pusher('443c8c0a97a80fc51fe8', {
//       cluster: 'ap2',
//       forceTLS: true,
//       authorizer: (channel: any) => ({
//         authorize: (socketId: string, callback: Function) => {
//           const authUrl = 'https://apis.staffoo.com.au/broadcasting/auth';
//           fetch(authUrl, {
//             method: 'POST',
//             headers: {
//               Authorization: `Bearer ${token}`,
//               'Content-Type': 'application/json',
//               Accept: 'application/json',
//             },
//             body: JSON.stringify({
//               socket_id: socketId,
//               channel_name: channel.name,
//             }),
//           })
//             .then(async (res) => {
//               const data = await res.json();
//               if (!res.ok) {
//                 console.error('[Echo] Auth failed:', data);
//                 return callback(true, data);
//               }
//               callback(false, data);
//             })
//             .catch((err) => {
//               console.error('[Echo] Auth error:', err);
//               callback(true, err);
//             });
//         },
//       }),
//     });

//     echoInstance = new Echo({
//       broadcaster: 'pusher',
//       client: pusherClient,
//       key: '443c8c0a97a80fc51fe8',
//       cluster: 'ap2',
//       forceTLS: true,
//     });

//     // Connection logging
//     const connection = echoInstance.connector.pusher.connection;
//     connection.bind('connected', () => 
//       console.log('%c✅ Pusher Connected Successfully', 'color:#22C55E;font-weight:bold')
//     );
//     connection.bind('disconnected', () => 
//       console.log('%c❌ Pusher Disconnected', 'color:#EF4444')
//     );
//     connection.bind('error', (err: any) => 
//       console.error('[Echo] Pusher Error:', err)
//     );
//   }

//   return echoInstance;
// }

// export function destroyEchoInstance() {
//   if (echoInstance) {
//     try {
//       echoInstance.disconnect();
//     } catch (e) {}
//     echoInstance = null;
//     console.log('[Echo] Instance destroyed');
//   }
// }


// echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import { getAuthToken } from './services/authApi';


// @ts-ignore
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
}

let echoInstance: any = null;

// export async function getEchoInstance() {
//   const token = await getAuthToken();

//   if (!token) {
//     console.error('[Echo] ❌ No authentication token found in storage. Please login again.');
//     throw new Error('No authentication token found');
//   }

//   // Always destroy old instance to prevent stale token
//   if (echoInstance) {
//     try {
//       echoInstance.disconnect();
//     } catch (e) {}
//     echoInstance = null;
//   }

//   console.log('[Echo] Creating new Echo instance with fresh token...');

//   echoInstance = new Echo({
//     broadcaster: 'pusher',
//     key: '443c8c0a97a80fc51fe8',
//     cluster: 'ap2',
//     forceTLS: true,

//     // Recommended & simplest way for Sanctum API tokens
//     authEndpoint: 'https://apis.staffoo.com.au/broadcasting/auth',

//     auth: {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         Accept: 'application/json',
//       },
//     },
//   });

//   // Logging
//   const connection = echoInstance.connector.pusher.connection;

//   connection.bind('connected', () => 
//     console.log('%c✅ Pusher Connected Successfully', 'color:#22C55E;font-weight:bold')
//   );
//   connection.bind('disconnected', () => 
//     console.log('%c❌ Pusher Disconnected', 'color:#EF4444')
//   );
//   connection.bind('error', (err: any) => 
//     console.error('[Echo] Pusher Error:', err)
//   );

//   return echoInstance;
// }

export async function getEchoInstance() {
  if (echoInstance) {
    return echoInstance; // ✅ reuse existing
  }

  const token = await getAuthToken();

  if (!token) {
    throw new Error('No authentication token');
  }

  console.log('[Echo] Creating NEW instance');

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: '443c8c0a97a80fc51fe8',
    cluster: 'ap2',
    forceTLS: true,
    authEndpoint: 'https://apis.staffoo.com.au/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
}

export function destroyEchoInstance() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {}
    echoInstance = null;
    console.log('[Echo] Instance destroyed');
  }
}