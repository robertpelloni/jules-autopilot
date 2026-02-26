/**
 * @jest-environment node
 */
import { POST } from './route';

describe('Login API (Deprecated)', () => {
  it('should return 410 Gone deprecation notice for all requests', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'test-key' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(410);
    expect(data.error.code).toBe('DEPRECATED');
    expect(data.error.message).toContain('deprecated');
  });
});
