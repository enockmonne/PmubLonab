const DEFAULT_TIMEOUT_MS = 10000;

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiRequestError(`Request failed with status ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
