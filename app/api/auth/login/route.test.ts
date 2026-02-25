
import { POST } from './route';

// Mock setSession
jest.mock('@/lib/session', () => ({
  setSession: jest.fn(),
}));

import { setSession } from '@/lib/session';

describe('Login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if API key is missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({
      error: expect.objectContaining({
        code: 'BAD_REQUEST',
        message: 'API Key required'
      })
    });
  });

  it('should set session and return success if API key is provided', async () => {
    const mockApiKey = 'valid-api-key';
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ apiKey: mockApiKey }),
    });

    (setSession as jest.Mock).mockResolvedValue(undefined);

    const res = await POST(req);
    const data = await res.json();

    expect(setSession).toHaveBeenCalledWith(mockApiKey);
    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it('should return 500 if setSession fails', async () => {
    const mockApiKey = 'valid-api-key';
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ apiKey: mockApiKey }),
    });

    (setSession as jest.Mock).mockRejectedValue(new Error('Session error'));

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toEqual({
      error: expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Session error'
      })
    });
  });
});
