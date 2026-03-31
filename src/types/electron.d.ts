export {};

declare global {
  interface Window {
    electron?: {
      printSilent: () => Promise<void>;
    };
  }
}
