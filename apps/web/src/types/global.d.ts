declare global {
  interface Window {
    ethereum?: unknown & { request?: (args: { method: string }) => Promise<string[]> };
  }
}

export {};
