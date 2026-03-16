import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runSecurityChecks } from '../src/securityChecks';
import { TelemetryReporter } from '../src/telemetry';
import type { AuthConfig } from '../src/config';

function makeConfig(overrides: Partial<AuthConfig>): AuthConfig {
  return {
    baseUrl: 'https://auth.example.com',
    clientId: 'testing',
    clientSecret: 'secret-value-12345',
    timeoutMs: 4000,
    defaultHeaders: { 'Content-Type': 'application/json' },
    defaultScopes: ['openid'],
    telemetry: {
      filePath: path.join(process.cwd(), 'var', 'telemetry.ndjson'),
      metricsFile: path.join(process.cwd(), 'var', 'metrics.prom'),
      tailLimit: 10,
    },
    integrations: {},
    security: undefined,
    checks: {
      requireIntegrations: [],
      requireScopes: ['openid'],
      requireControls: [],
      expectTelemetry: true,
    },
    workflows: [],
    profile: undefined,
    metadata: {
      configPath: '<memory>',
      resolvedFromExample: false,
      profileEnv: {},
    },
    mockUser: undefined,
    ...overrides,
  };
}

describe('runSecurityChecks', () => {
  it('validates config and emits telemetry', async () => {
    const telemetryEvents: any[] = [];
    const telemetry = new TelemetryReporter({
      writer: (event) => telemetryEvents.push(event),
    });

    const results = await runSecurityChecks({
      config: makeConfig({}),
      telemetry,
      probeHealth: false,
    });

    expect(results.find((result) => result.name === 'base-url')?.ok).toBe(true);
    expect(results.find((result) => result.name === 'telemetry')?.ok).toBe(true);
    expect(telemetryEvents.some((event) => event.action === 'security-check')).toBe(true);
  });

  it('detects unsafe client secret', async () => {
    const results = await runSecurityChecks({
      config: makeConfig({
        baseUrl: 'http://auth.example.com',
        timeoutMs: 1000,
        clientSecret: undefined,
      }),
      probeHealth: false,
    });

    const clientSecretCheck = results.find((result) => result.name === 'client-secret');
    expect(clientSecretCheck?.ok).toBe(false);
    const timeoutCheck = results.find((result) => result.name === 'timeout');
    expect(timeoutCheck?.ok).toBe(false);
  });
});
