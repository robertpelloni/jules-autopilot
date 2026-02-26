
import { POST } from './route';

// Mock dependencies
jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));
jest.mock('@jules/shared', () => ({
  getProvider: jest.fn(),
  runDebate: jest.fn(),
  runConference: jest.fn(),
  runCodeReview: jest.fn(),
  summarizeSession: jest.fn(),
}));

// We need to mock the dynamic import for summarizeSession. 
// Since Jest mocks are hoisted, standard mocking of the module path works 
// even if imported dynamically in the code, usually. 
// If not, we might need `jest.mock` with `virtual: true` or similar, 
// but let's try standard mock first.

import { getSession } from '@/lib/session';
import { getProvider } from '@jules/shared';
import { runDebate } from '@jules/shared';
import { runCodeReview } from '@jules/shared';

describe('Supervisor API', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new Request('http://localhost:3000/api/supervisor', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('should return 400 if apiKey/provider missing and no session', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const req = createRequest({ messages: [] }); // missing provider/apiKey
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  describe('list_models', () => {
    it('should list models successfully', async () => {
      (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
      const mockListModels = jest.fn().mockResolvedValue(['model1', 'model2']);
      (getProvider as jest.Mock).mockReturnValue({ listModels: mockListModels });

      const req = createRequest({ action: 'list_models', provider: 'test-provider' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.models).toEqual(['model1', 'model2']);
      expect(mockListModels).toHaveBeenCalledWith(mockApiKey);
    });

    it('should return 400 if provider is invalid', async () => {
      (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
      (getProvider as jest.Mock).mockReturnValue(null);

      const req = createRequest({ action: 'list_models', provider: 'invalid' });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe('debate', () => {
    it('should run debate successfully', async () => {
      (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
      (runDebate as jest.Mock).mockResolvedValue({ summary: 'Debate done' });

      const req = createRequest({
        action: 'debate',
        participants: [{ name: 'P1' }],
        messages: [],
        topic: 'Test'
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ summary: 'Debate done' });
      expect(runDebate).toHaveBeenCalled();
    });

    it('should return 400 for invalid participants', async () => {
      (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
      const req = createRequest({ action: 'debate', participants: 'invalid' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('review', () => {
    it('should run review successfully', async () => {
      (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
      (runCodeReview as jest.Mock).mockResolvedValue('Review result');

      const req = createRequest({
        action: 'review',
        codeContext: 'const a = 1;',
        provider: 'openai'
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ content: 'Review result' });
    });

    it('should return 400 if codeContext is missing', async () => {
      (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
      const req = createRequest({ action: 'review' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('Default Supervisor', () => {
    it('should run default completion successfully', async () => {
      (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
      const mockComplete = jest.fn().mockResolvedValue({ content: 'Supervisor says...' });
      (getProvider as jest.Mock).mockReturnValue({ complete: mockComplete });

      const req = createRequest({
        messages: [{ role: 'user', content: 'Help' }],
        provider: 'openai'
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.content).toBe('Supervisor says...');
    });
  });
});
