// onesignal.d.ts

declare module 'react-native-onesignal' {
  export enum LogLevel {
    None = 0,
    Error = 1,
    Warn = 2,
    Info = 3,
    Debug = 4,
    Verbose = 6,
  }

  namespace OneSignal {
    namespace Debug {
      function setLogLevel(level: LogLevel): void;
    }

    function initialize(appId: string): void;

    namespace Notifications {
      function requestPermission(fallbackToSettings?: boolean): Promise<boolean>;
    }

    namespace User {
      namespace pushSubscription {
        const id: string | undefined;
        function addEventListener(event: 'change', callback: (event: any) => void): void;
        function removeEventListener(event: 'change', callback: (event: any) => void): void;

        export function getIdAsync() {
          throw new Error('Function not implemented.');
        }
      }

      export function login(externalId: string) {
        throw new Error('Function not implemented.');
      }
    }

    export function setLogLevel(arg0: number, arg1: number) {
      throw new Error('Function not implemented.');
    }
  }

  const OneSignal: typeof OneSignal;
  export default OneSignal;
}