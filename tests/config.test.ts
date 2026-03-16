import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadAuthConfig } from '../src/config';

function createTempConfig(payload: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blackcat-auth-config-'));
  const file = path.join(dir, 'auth.config.json');
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

describe('loadAuthConfig', () => {
  it('loads config from explicit file and merges overrides plus defaults', () => {
    const file = createTempConfig({
      auth: {
        baseUrl: 'https://auth.example.com/',
        clientId: 'cli-app',
        defaultHeaders: {
          'X-Test': '1',
        },
        defaultScopes: ['openid', 'profile'],
      },
      telemetry: {
        filePath: 'tmp/telemetry.json',
      },
      runtime: {
        timeoutMs: 8000,
      },
      integrations: {
        auth: './bin/auth',
      },
      checks: {
        requireControls: ['encryption'],
      },
    });

    const config = loadAuthConfig({
      configPath: file,
      overrides: {
        runtime: { timeoutMs: 5000 },
      },
    });

    expect(config.baseUrl).toBe('https://auth.example.com');
    expect(config.clientId).toBe('cli-app');
    expect(config.timeoutMs).toBe(5000);
    expect(config.defaultHeaders).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Test': '1',
    });
    expect(config.telemetry.filePath.endsWith('tmp/telemetry.json')).toBe(true);
    expect(config.checks.requireControls).toContain('encryption');
  });

  it('falls back to env vars when config file is empty', () => {
    const file = createTempConfig({});
    const config = loadAuthConfig({
      configPath: file,
      env: {
        BLACKCAT_AUTH_BASE_URL: 'https://env.example.com',
        BLACKCAT_AUTH_CLIENT_ID: 'env-cli',
        BLACKCAT_AUTH_CLIENT_SECRET: 'env-secret',
        BLACKCAT_AUTH_TIMEOUT_MS: '6000',
      },
    });

    expect(config.baseUrl).toBe('https://env.example.com');
    expect(config.clientId).toBe('env-cli');
    expect(config.clientSecret).toBe('env-secret');
    expect(config.timeoutMs).toBe(6000);
  });
});
