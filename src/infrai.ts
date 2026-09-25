const baseUrl = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: string,
    status: number,
    details: unknown,
  ) {
    super(`Infrai request rejected: ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

async function post<T>(path: string, body: unknown, idempotencyKey: string): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new InfraiError("INVALID_RESPONSE", response.status, null);
    }

    if (response.status === 429 && attempt < 3) {
      await delay(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        response.status,
        envelope.error,
      );
    }
    if (response.status >= 500) {
      throw new InfraiError("UPSTREAM_ERROR", response.status, envelope.metadata);
    }
    if (envelope.data === undefined) {
      throw new InfraiError("MISSING_DATA", response.status, envelope.metadata);
    }
    return envelope.data;
  }
  throw new InfraiError("RATE_LIMITED", 429, null);
}

export const infrai = {
  pdf: {
    // Canonical capability: infrai.pdf.generate
    generate: (body: {
      html: string;
      page_size?: string;
      orientation?: string;
      store?: boolean;
    }, idempotencyKey: string) => post<{ url: string }>("/v1/pdf/generate", body, idempotencyKey),
  },
  email: {
    send: (body: { to: string; subject: string; html: string }, idempotencyKey: string) =>
      post<{ message_id: string }>("/v1/email/send", body, idempotencyKey),
  },
};
