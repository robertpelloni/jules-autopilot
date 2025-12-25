/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import { SessionKeeperManager } from './session-keeper-manager';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { useRouter } from 'next/navigation';

// Mocks
global.fetch = jest.fn();
jest.mock('@/lib/jules/provider');
jest.mock('@/lib/stores/session-keeper');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
describe('SessionKeeperManager', () => {
  const mockClient = {
    listSessions: jest.fn(),
    listActivitiesPaged: jest.fn(),
    createActivity: jest.fn(),
    approvePlan: jest.fn(),
    getActivity: jest.fn(),
    listActivities: jest.fn(),
  };

  const mockSetStatusSummary = jest.fn();
  const mockAddLog = jest.fn();
  const mockIncrementStat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useJules as jest.Mock).mockReturnValue({
      client: mockClient,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    (useSessionKeeperStore as unknown as jest.Mock).mockReturnValue({
      config: {
        isEnabled: true,
        checkIntervalSeconds: 1, // Fast interval for testing
        inactivityThresholdMinutes: 10,
        activeWorkThresholdMinutes: 20,
        autoSwitch: false,
        messages: ['Test Message'],
        customMessages: {},
        debateEnabled: false,
      },
      addLog: mockAddLog,
      setStatusSummary: mockSetStatusSummary,
      incrementStat: mockIncrementStat,
    });
  });

  it('should do nothing if disabled', () => {
    (useSessionKeeperStore as unknown as jest.Mock).mockReturnValue({
      config: { isEnabled: false },
    });

    render(<SessionKeeperManager />);
    expect(mockClient.listSessions).not.toHaveBeenCalled();
  });

  it('should list sessions on mount if enabled', async () => {
    mockClient.listSessions.mockResolvedValue([]);

    render(<SessionKeeperManager />);

    // Wait for effect
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockClient.listSessions).toHaveBeenCalled();
  });

  it('should approve plan if session is awaiting approval', async () => {
    mockClient.listSessions.mockResolvedValue([
      { id: 'session-1', status: 'awaiting_approval', lastActivityAt: new Date().toISOString() }
    ]);
    mockClient.listActivitiesPaged.mockResolvedValue({
      activities: [{ id: '1', content: 'plan', role: 'agent', createdAt: new Date().toISOString() }]
    });

    render(<SessionKeeperManager />);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockClient.approvePlan).toHaveBeenCalledWith('session-1');
  });

  it('should nudge if session is inactive', async () => {
    const oldDate = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago

    mockClient.listSessions.mockResolvedValue([
      { id: 'session-1', status: 'active', lastActivityAt: oldDate, rawState: 'ACTIVE' }
    ]);

    // listActivitiesPaged for 1 item check
    mockClient.listActivitiesPaged.mockResolvedValue({
        activities: [{ id: '1', content: 'agent message', role: 'agent', createdAt: oldDate }]
    });

    // listActivities for full context (fallback)
    mockClient.listActivities.mockResolvedValue([
        { id: '1', content: 'agent message', role: 'agent', createdAt: oldDate }
    ]);

    render(<SessionKeeperManager />);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async check

    expect(mockClient.createActivity).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-1',
      content: 'Test Message'
    }));
  });

  it('should call supervisor API if smart pilot enabled', async () => {
    (useSessionKeeperStore as unknown as jest.Mock).mockReturnValue({
        config: {
          isEnabled: true,
          checkIntervalSeconds: 1,
          inactivityThresholdMinutes: 10,
          activeWorkThresholdMinutes: 20,
          smartPilotEnabled: true,
          supervisorApiKey: 'test-key',
          supervisorProvider: 'openai',
          messages: ['Fallback'],
          customMessages: {}
        },
        addLog: mockAddLog,
        setStatusSummary: mockSetStatusSummary,
        incrementStat: mockIncrementStat,
      });

    const oldDate = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    mockClient.listSessions.mockResolvedValue([
        { id: 'session-1', status: 'active', lastActivityAt: oldDate, rawState: 'ACTIVE' }
    ]);
    mockClient.listActivitiesPaged.mockResolvedValue({
        activities: [{ id: '1', content: 'msg', role: 'agent', createdAt: oldDate }]
    });
    mockClient.listActivities.mockResolvedValue([
        { id: '1', content: 'msg', role: 'agent', createdAt: oldDate }
    ]);

    // Mock global fetch for supervisor
    (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ content: 'Supervisor says hello' })
    });

    render(<SessionKeeperManager />);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledWith('/api/supervisor', expect.anything());
    expect(mockClient.createActivity).toHaveBeenCalledWith(expect.objectContaining({
        content: 'Supervisor says hello'
    }));
  });
});
