import { useSessionKeeperStore } from './session-keeper';

// Mock global fetch
global.fetch = jest.fn();

describe('SessionKeeper Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionKeeperStore.getState().clearLogs();
    useSessionKeeperStore.setState({ config: { isEnabled: false } as any });
  });

  it('should use relative path for loadConfig', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // First call: /api/settings/keeper
        ok: true,
        json: async () => ({ isEnabled: true }),
      })
      .mockResolvedValueOnce({ // Second call: /api/daemon/status
        ok: true,
        json: async () => ({ isEnabled: true, logs: [] }),
      });

    await useSessionKeeperStore.getState().loadConfig();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/settings/keeper'
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/daemon/status'
    );
  });

  it('should use relative path for saveConfig', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await useSessionKeeperStore.getState().saveConfig({ isEnabled: true } as any);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/settings/keeper',
      expect.objectContaining({ method: 'POST' })
    );

    // Check start endpoint call
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/daemon/start',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
