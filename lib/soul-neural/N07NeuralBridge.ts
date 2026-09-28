export type NeuralOperation =
  | "neural.forward@1.0.0"
  | "neural.learn@1.0.0"
  | "neural.parameters@1.0.0";

export type NeuralParameters = {
  size: number;
  learning_rate: number;
  optimizer: string;
  regularization: number;
  gradient_clip: number;
  heads: number;
  batch_cache: number;
  layers: Array<Record<string, unknown>>;
};

export type NeuralRequest = {
  operation: NeuralOperation;
  payload: number[];
  correlationId?: string;
  deadlineMs?: number;
};

export type NeuralResponse = {
  traceId: string;
  correlationId: string;
  payload?: number[];
  data?: unknown;
  status?: string;
  parameters?: NeuralParameters;
};

type CanonicalEnvelope = {
  protocol: "soul-mesh/1";
  contractVersion: "1.1.0";
  id: string;
  correlationId: string;
  source: "N05";
  target: "N07";
  kind: "request";
  capability: string;
  payload: { values: number[] };
  timestamp: number;
  nonce: string;
};

const CONTRACT = "1.1.0" as const;
const PROTOCOL = "soul-mesh/1" as const;
const env = () =>
  ((globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env ?? {});

const id = (prefix: string): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
};

function canonicalWire(value: CanonicalEnvelope): string {
  return JSON.stringify({
    protocol: value.protocol,
    contractVersion: value.contractVersion,
    id: value.id,
    correlationId: value.correlationId,
    source: value.source,
    target: value.target,
    kind: value.kind,
    capability: value.capability,
    payload: value.payload,
    timestamp: value.timestamp,
    transport: null,
    meta: null,
    nonce: value.nonce,
  });
}

function canonicalLegacyResponse(value: Record<string, unknown>, nonce: string): string {
  return JSON.stringify({
    version: "1.0",
    contractVersion: CONTRACT,
    messageId: String(value.id ?? value.messageId ?? ""),
    source: "N07",
    target: "N05",
    timestamp: Number(value.timestamp ?? 0),
    nonce,
    correlationId: String(value.correlationId ?? ""),
    type: String(value.kind ?? "response") === "error" ? "ERROR" : "TASK_RESULT",
    payload: {
      capability: String(value.capability ?? ""),
      payload: value.payload ?? {},
    },
  });
}

async function hmacHex(data: string, secret: string): Promise<string> {
  if (secret.length < 16) {
    throw new Error("SOUL_MESH_HMAC_SECRET must contain at least 16 characters");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(value: CanonicalEnvelope, secret: string): Promise<string> {
  if (!secret.trim()) throw new Error("SOUL_MESH_HMAC_SECRET is required");
  return hmacHex(canonicalWire(value), secret);
}

async function verifyResponse(
  value: Record<string, unknown>,
  response: Response,
  secret: string,
): Promise<void> {
  if (!secret.trim()) throw new Error("SOUL_MESH_HMAC_SECRET is required");
  const nonce = response.headers.get("x-soul-mesh-nonce")?.trim() || String(value.nonce ?? "");
  const signature = response.headers.get("x-soul-mesh-hmac")?.trim() || String(value.hmac ?? "");
  if (!nonce || !signature) throw new Error("N07 Mesh response HMAC credentials missing");
  const timestamp = Number(value.timestamp ?? 0);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 30000) {
    throw new Error("N07 Mesh response timestamp outside accepted clock skew");
  }
  const expected = await hmacHex(canonicalLegacyResponse(value, nonce), secret);
  if (expected !== signature) throw new Error("N07 Mesh response HMAC mismatch");
}

export class N07NeuralBridge {
  private readonly url: string;
  private readonly secret: string;
  private readonly timeout: number;

  constructor(
    private readonly source: "N05",
    options: { baseUrl?: string; secret?: string; timeoutMs?: number } = {},
  ) {
    this.url = (options.baseUrl ?? env().SOUL_N07_URL ?? "").replace(/\/$/, "");
    this.secret = options.secret ?? env().SOUL_MESH_HMAC_SECRET ?? "";
    this.timeout = options.timeoutMs ?? 15000;
    if (!this.url) throw new Error("SOUL_N07_URL is required");
  }

  async invoke(request: NeuralRequest): Promise<NeuralResponse> {
    if (
      request.operation !== "neural.parameters@1.0.0" &&
      (request.payload.length === 0 || request.payload.some(value => !Number.isFinite(value)))
    ) {
      throw new Error("neural payload must contain finite numbers");
    }

    const correlationId = request.correlationId?.trim() || id("corr");
    const nonce = id("nonce");
    const envelope: CanonicalEnvelope = {
      protocol: PROTOCOL,
      contractVersion: CONTRACT,
      id: id("msg"),
      correlationId,
      source: this.source,
      target: "N07",
      kind: "request",
      capability: request.operation.split("@")[0],
      payload: { values: request.payload },
      timestamp: Date.now(),
      nonce,
    };

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-soul-contract-version": CONTRACT,
      "x-soul-correlation-id": correlationId,
    };
    const signature = await sign(envelope, this.secret);
    if (signature) {
      headers["x-soul-mesh-nonce"] = nonce;
      headers["x-soul-mesh-hmac"] = signature;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(1, request.deadlineMs ?? this.timeout),
    );

    try {
      const response = await fetch(`${this.url}/api/soul-mesh`, {
        method: "POST",
        headers,
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });
      const result = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(String(result.error ?? `N07 Mesh request failed: ${response.status}`));
      }
      if (String(result.contractVersion) !== CONTRACT) {
        throw new Error("N07 Mesh response contract mismatch");
      }
      if (String(result.correlationId) !== correlationId) {
        throw new Error("N07 Mesh correlation mismatch");
      }
      await verifyResponse(result, response, this.secret);

      const payload = result.payload as Record<string, unknown> | undefined;
      const values = Array.isArray(payload?.values)
        ? payload.values.map(Number)
        : undefined;
      const metadata = result.metadata as Record<string, unknown> | undefined;
      let parameters: NeuralParameters | undefined;
      const rawParameters = metadata?.parameters;
      if (typeof rawParameters === "string" && rawParameters.trim()) {
        try {
          parameters = JSON.parse(rawParameters) as NeuralParameters;
        } catch {
          throw new Error("N07 Mesh neural parameters payload is invalid JSON");
        }
      }

      return {
        traceId: String(result.id ?? result.messageId ?? envelope.id),
        correlationId,
        payload: values,
        data: result.payload,
        status: String(payload?.status ?? result.status ?? "ok"),
        parameters,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  forward(payload: number[], correlationId?: string) {
    return this.invoke({
      operation: "neural.forward@1.0.0",
      payload,
      correlationId,
    });
  }

  learn(input: number[], target: number[], correlationId?: string) {
    if (input.length === 0 || input.length !== target.length) {
      throw new Error("input and target dimensions must match");
    }
    return this.invoke({
      operation: "neural.learn@1.0.0",
      payload: [...input, ...target],
      correlationId,
    });
  }

  async parameters(correlationId?: string): Promise<NeuralParameters> {
    const response = await this.invoke({
      operation: "neural.parameters@1.0.0",
      payload: [],
      correlationId,
    });
    if (!response.parameters) throw new Error("N07 Mesh neural parameters missing");
    return response.parameters;
  }
}
