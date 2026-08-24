/**
 * Mock adapters answer asynchronously so the UI exercises its real loading
 * states. Latency and failure injection are configurable so error states can
 * be demonstrated without touching component code.
 */
export type MockBehaviour = {
  /** Simulated round-trip in milliseconds. */
  latencyMs: number;
  /** 0–1. Fraction of calls that reject, for exercising error states. */
  failureRate: number;
};

/**
 * Defaults can be overridden at build time so loading and error states are
 * demonstrable without editing code — see `.env.example`.
 */
const behaviour: MockBehaviour = {
  latencyMs: readNumber(process.env.EXPO_PUBLIC_TPAY_MOCK_LATENCY_MS, 420, 0, 10_000),
  failureRate: readNumber(process.env.EXPO_PUBLIC_TPAY_MOCK_FAILURE_RATE, 0, 0, 1),
};

function readNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (raw === undefined || Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function configureMockBehaviour(next: Partial<MockBehaviour>): void {
  Object.assign(behaviour, next);
}

export function getMockBehaviour(): Readonly<MockBehaviour> {
  return behaviour;
}

export class MockServiceError extends Error {
  constructor(operation: string) {
    super(`Simulated failure in ${operation}`);
    this.name = 'MockServiceError';
  }
}

/** Resolves `value` after the configured latency, or rejects if injected. */
export async function respond<T>(operation: string, value: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, behaviour.latencyMs));
  if (behaviour.failureRate > 0 && Math.random() < behaviour.failureRate) {
    throw new MockServiceError(operation);
  }
  return value;
}
