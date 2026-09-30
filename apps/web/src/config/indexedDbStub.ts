/**
 * WalletConnect / Web3Modal read indexedDB during SSR of client components.
 * Node has no indexedDB; a no-op stub prevents ReferenceError.
 */
export function stubIndexedDbForSsr(): void {
  if (typeof globalThis.indexedDB !== "undefined") return;
  const request = () => ({
    result: undefined,
    error: null,
    readyState: "done",
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    onblocked: null,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    writable: true,
    value: {
      open: request,
      deleteDatabase: request,
      databases: async () => [],
      cmp: () => 0,
    },
  });
}

stubIndexedDbForSsr();
