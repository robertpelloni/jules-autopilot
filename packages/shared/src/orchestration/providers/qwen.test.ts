
import { qwenProvider } from './qwen';

global.fetch = jest.fn() as unknown as typeof fetch;

describe('Qwen Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('complete', () => {
    it('should call Qwen API correctly', async () => {
      const mockResponse = {
        output: {
          choices: [{
            message: { content: 'Hello from Qwen' }
          }]
        }
      };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await qwenProvider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
        apiKey: 'key',
        model: 'qwen-turbo',
        systemPrompt: 'SysPrompt',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer key',
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );

      const callArgs = (global.fetch as unknown as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.input.messages[0]).toEqual({ role: 'system', content: 'SysPrompt' });
      expect(body.input.messages[1]).toEqual({ role: 'user', content: 'Hi' });
      expect(body.parameters.result_format).toBe('message');

      expect(result.content).toBe('Hello from Qwen');
    });

    it('should handle message role mapping and name sanitization', async () => {
      const mockResponse = { output: { text: 'Response' } };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await qwenProvider.complete({
        messages: [
          { role: 'user', content: 'User msg', name: 'User 1' },
          { role: 'system', content: 'Intermediate system' },
          { role: 'assistant', content: 'Assistant msg' },
          { role: 'user', content: 'Unknown role msg' }
        ],
        apiKey: 'key',
        model: 'qwen-plus'
      });

      const callArgs = (global.fetch as unknown as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const msgs = body.input.messages;

      expect(msgs[0]).toEqual(expect.objectContaining({ role: 'user', content: 'User msg', name: 'User_1' }));
      expect(msgs[1]).toEqual(expect.objectContaining({ role: 'system', content: 'Intermediate system' }));
      expect(msgs[2]).toEqual(expect.objectContaining({ role: 'assistant', content: 'Assistant msg' }));
    });

    it('should throw error on API failure', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid API Key' }),
      });

      await expect(qwenProvider.complete({
        messages: [],
        apiKey: 'key',
        model: 'qwen-turbo'
      })).rejects.toThrow('Qwen API error: Invalid API Key');
    });
  });

  describe('listModels', () => {
    it('should return supported models', async () => {
      const models = await qwenProvider.listModels('key');
      expect(models).toEqual(['qwen-turbo', 'qwen-plus', 'qwen-max']);
    });
  });
});
