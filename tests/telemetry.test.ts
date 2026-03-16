import { describe, expect, it } from 'vitest';

import { TelemetryReporter } from '../src/telemetry';

describe('TelemetryReporter', () => {
  it('records events through custom writer', async () => {
    const events: any[] = [];
    const reporter = new TelemetryReporter({
      writer: (event) => events.push(event),
      tags: { service: 'test' },
    });

    await reporter.run('test-action', { route: '/login' }, async () => 'ok');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: 'test-action',
      ok: true,
      meta: { route: '/login' },
      tags: { service: 'test' },
    });
  });

  it('captures errors', async () => {
    const events: any[] = [];
    const reporter = new TelemetryReporter({
      writer: (event) => events.push(event),
    });

    await expect(
      reporter.run('broken', {}, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(events[0]).toMatchObject({ action: 'broken', ok: false, error: 'boom' });
  });
});
