import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runCli } from '../src/cli';

function createTempConfig(payload: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blackcat-auth-cli-'));
  const file = path.join(dir, 'config.json');
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

function captureIO() {
  const logs: string[] = [];
  const errors: string[] = [];
  return {
    io: {
      log: (message: string) => logs.push(message),
      error: (message: string) => errors.push(message),
    },
    logs,
    errors,
  };
}

describe('CLI', () => {
  it('renders config via config:show', async () => {
    const configPath = createTempConfig({
      auth: {
        baseUrl: 'https://cli.example.com',
        clientId: 'cli-id',
        clientSecret: 'cli-secret-value',
      },
      runtime: {
        timeoutMs: 5000,
      },
      telemetry: {
        filePath: path.join(os.tmpdir(), 'auth-cli-config.ndjson'),
        metricsFile: path.join(os.tmpdir(), 'auth-cli-config.prom'),
      },
    });

    const { io, logs } = captureIO();
    const exitCode = await runCli(['config:show', '--config', configPath, '--json'], io);

    expect(exitCode).toBe(0);
    expect(JSON.parse(logs[0]).baseUrl).toBe('https://cli.example.com');
  });

  it('fails security:check when config invalid', async () => {
    const configPath = createTempConfig({
      auth: {
        baseUrl: 'http://weak-host',
        clientId: 'demo',
      },
      runtime: {
        timeoutMs: 1000,
      },
      telemetry: {
        filePath: path.join(os.tmpdir(), 'auth-cli-sec.ndjson'),
        metricsFile: path.join(os.tmpdir(), 'auth-cli-sec.prom'),
      },
    });

    const { io, errors } = captureIO();
    const exitCode = await runCli(['security:check', '--config', configPath, '--json', '--no-probe'], io);

    expect(exitCode).toBe(1);
    expect(errors[0]).toContain('Security or integration checks failed');
  });

  it('executes password login via mock client by default', async () => {
    const configPath = createTempConfig({
      auth: {
        baseUrl: 'https://cli.example.com',
        clientId: 'cli-id',
        clientSecret: 'cli-secret-value',
        defaultScopes: ['openid', 'profile'],
      },
      telemetry: {
        filePath: path.join(os.tmpdir(), 'auth-cli-login.ndjson'),
        metricsFile: path.join(os.tmpdir(), 'auth-cli-login.prom'),
      },
    });

    const { io, logs } = captureIO();
    const exitCode = await runCli(['login:password', 'demo@example.com', 'secret', '--config', configPath, '--json'], io);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(logs[0]);
    expect(payload.accessToken).toBeDefined();
    expect(payload.refreshToken).toBeDefined();
  });

  it('runs client credential flow with custom scopes', async () => {
    const configPath = createTempConfig({
      auth: {
        baseUrl: 'https://cli.example.com',
        clientId: 'cli-id',
        clientSecret: 'cli-secret-value',
        defaultScopes: ['openid'],
      },
      telemetry: {
        filePath: path.join(os.tmpdir(), 'auth-cli-client.ndjson'),
        metricsFile: path.join(os.tmpdir(), 'auth-cli-client.prom'),
      },
    });

    const { io, logs } = captureIO();
    const exitCode = await runCli(['token:client', 'openid,email', '--config', configPath, '--json'], io);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(logs[0]);
    expect(payload.accessToken).toBeTruthy();
  });

  it('reads synthetic events via events:stream', async () => {
    const configPath = createTempConfig({
      auth: {
        baseUrl: 'https://cli.example.com',
        clientId: 'cli-id',
      },
      telemetry: {
        filePath: path.join(os.tmpdir(), 'auth-cli-events.ndjson'),
        metricsFile: path.join(os.tmpdir(), 'auth-cli-events.prom'),
      },
    });

    const { io, logs } = captureIO();
    const exitCode = await runCli(['events:stream', '--config', configPath, '--json'], io);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(logs[0]);
    expect(payload.events?.length).toBeGreaterThan(0);
  });
});
