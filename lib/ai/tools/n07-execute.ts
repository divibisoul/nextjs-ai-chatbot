import { tool } from 'ai';
import { z } from 'zod';

const N07_URL = process.env.N07_ORCHESTRATOR_URL?.replace(/\/$/, '');
const N07_TOKEN = process.env.N07_APP_TOKEN;

export const n07Execute = tool({
  description:
    'Use the N07 SOUL Orchestrator for neural, cognitive, compute and SuperGPU capabilities. Only call it for operations that the orchestrator backend exposes.',
  inputSchema: z.object({
    tool: z.string().min(1),
    input: z.record(z.unknown()).default({}),
  }),
  execute: async ({ tool: requestedTool, input }) => {
    if (!N07_URL || !N07_TOKEN) {
      return { ok: false, error: 'N07 backend is not configured on the server' };
    }

    const response = await fetch(`${N07_URL}/v1/intent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${N07_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tool: requestedTool, input }),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => ({
      ok: false,
      error: 'N07 returned an invalid JSON response',
    }));

    if (!response.ok) {
      return { ok: false, status: response.status, ...payload };
    }

    return payload;
  },
});
