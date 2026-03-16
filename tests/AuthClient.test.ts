import { describe, expect, it, vi } from 'vitest';

import { AuthClient } from '../src/AuthClient';
import { TelemetryReporter } from '../src/telemetry';

describe('AuthClient', () => {
  it('executes requests with telemetry and fetch wrapper', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ accessToken: 'token', refreshToken: 'refresh' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const events: any[] = [];
    const telemetry = new TelemetryReporter({ writer: (event) => events.push(event) });
    const client = new AuthClient({
      baseUrl: 'https://auth.example.com/',
      fetcher,
      telemetry,
      timeoutMs: 10000,
    });

    const pair = await client.passwordGrant('user@example.com', 'secret');

    expect(pair.accessToken).toBe('token');
    expect(fetcher).toHaveBeenCalledWith('https://auth.example.com/login', expect.any(Object));
    expect(events[0]).toMatchObject({ action: 'POST /login', ok: true });
  });
});
