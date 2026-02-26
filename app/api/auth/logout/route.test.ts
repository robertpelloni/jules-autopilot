/**
 * @jest-environment node
 */
import { POST } from './route';

describe('Logout API (Deprecated)', () => {
  it('should return 410 Gone deprecation notice', async () => {
    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(410);
    expect(data.message).toContain('deprecated');
  });
});
