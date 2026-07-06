// Jest setup - add custom matchers if needed
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// jsdom does not provide TextEncoder/TextDecoder, which viem needs at import time.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
