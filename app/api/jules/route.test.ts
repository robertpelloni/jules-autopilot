
import { GET, POST, DELETE } from './[...path]/route';
import { NextRequest } from 'next/server';

// Mock global fetch
global.fetch = jest.fn() as unknown as typeof fetch;

// Mock getSession
jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

import { getSession } from '@/lib/session';

describe('Jules API Proxy', () => {
  const mockApiKey = 'test-api-key';
  // Note: The base URL in the test request object is for NextRequest internal parsing,
  // the actual proxy target is hardcoded in the route handler.
  const reqBaseUrl = 'http://localhost:3000/api/jules/test';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    (getSession as jest.Mock).mockResolvedValue({ apiKey: mockApiKey });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if API key is missing', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest(reqBaseUrl);
      const res = await GET(req, { params: Promise.resolve({ path: ['test'] }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should proxy GET request successfully', async () => {
      const mockResponseData = { data: 'test' };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      });

      const req = new NextRequest(reqBaseUrl);
      const res = await GET(req, { params: Promise.resolve({ path: ['test'] }) });
      const data = await res.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://jules.googleapis.com/v1alpha/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': mockApiKey,
          }),
        })
      );
      expect(res.status).toBe(200);
      expect(data).toEqual(mockResponseData);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as unknown as jest.Mock).mockRejectedValue(new Error('Network error'));

      const req = new NextRequest(reqBaseUrl);
      const res = await GET(req, { params: Promise.resolve({ path: ['test'] }) });
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data).toEqual({ error: 'Proxy error', message: 'Network error' });
    });
  });

  describe('POST', () => {
    it('should return 401 if API key is missing', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest(reqBaseUrl, { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ path: ['test'] }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should proxy POST request successfully', async () => {
      const mockRequestBody = { foo: 'bar' };
      const mockResponseData = { success: true };

      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockResponseData,
      });

      const req = new NextRequest(reqBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockRequestBody),
      });

      const res = await POST(req, { params: Promise.resolve({ path: ['create'] }) });
      const data = await res.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://jules.googleapis.com/v1alpha/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': mockApiKey,
          }),
        })
      );
      expect(res.status).toBe(201);
      expect(data).toEqual(mockResponseData);
    });
  });

  describe('DELETE', () => {
    it('should return 401 if API key is missing', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest(reqBaseUrl, { method: 'DELETE' });
      const res = await DELETE(req, { params: Promise.resolve({ path: ['test'] }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should proxy DELETE request successfully', async () => {
      const mockResponseData = { deleted: true };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      });

      const req = new NextRequest(reqBaseUrl, {
        method: 'DELETE',
      });

      const res = await DELETE(req, { params: Promise.resolve({ path: ['delete', '1'] }) });
      const data = await res.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://jules.googleapis.com/v1alpha/delete/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': mockApiKey,
          }),
        })
      );
      expect(res.status).toBe(200);
      expect(data).toEqual(mockResponseData);
    });
  });
});
