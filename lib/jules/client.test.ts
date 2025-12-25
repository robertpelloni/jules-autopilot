import { JulesClient, JulesAPIError, createJulesClient } from "./client";

// Mock global fetch
global.fetch = jest.fn();

describe("JulesClient", () => {
  const apiKey = "test-api-key";
  let client: JulesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createJulesClient(apiKey);
  });

  describe("constructor", () => {
    it("should be instantiated with an API key", () => {
      expect(client).toBeInstanceOf(JulesClient);
    });
  });

  describe("listSessions", () => {
    it("should fetch sessions and map states correctly", async () => {
      const mockResponse = {
        sessions: [
          {
            name: "sessions/sess-1",
            state: "ACTIVE",
            createTime: "2023-01-01T00:00:00Z",
            sourceContext: { source: "sources/github/owner/repo" },
          },
          {
            name: "sessions/sess-2",
            state: "COMPLETED",
            createTime: "2023-01-02T00:00:00Z",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const sessions = await client.listSessions();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/jules?path=%2Fsessions"),
        expect.objectContaining({
          headers: expect.objectContaining({ "X-Jules-Api-Key": apiKey }),
        }),
      );

      expect(sessions).toHaveLength(2);
      expect(sessions[0].status).toBe("active");
      expect(sessions[1].status).toBe("completed");
      expect(sessions[0].sourceId).toBe("owner/repo");
    });
  });

  describe('createSession', () => {
    it('should set requirePlanApproval to true', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'sessions/session-1',
          createTime: '2023-01-01T00:00:00Z',
          updateTime: '2023-01-01T00:00:00Z',
        }),
      });

      await client.createSession({
        prompt: 'test prompt',
        sourceId: 'test/repo',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/jules?path=%2Fsessions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"requirePlanApproval":true'),
        })
      );
    });
  });

  describe('approvePlan', () => {
    it('should post to the correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.approvePlan('session-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/jules?path=%2Fsessions%2Fsession-123%3AapprovePlan'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe("listActivities", () => {
    const sessionId = "session-123";

    it("should correctly map a planGenerated activity", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-1",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            planGenerated: {
              plan: {
                title: "Test Plan",
                steps: [{ text: "step 1" }],
              },
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const activities = await client.listActivities(sessionId);

      expect(activities[0].type).toBe("plan");
      expect(activities[0].content).toContain("Test Plan");
      expect(activities[0].role).toBe("agent");
    });

    it("should correctly map a progressUpdated activity", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-2",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            progressUpdated: {
              description: "Working on it...",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const activities = await client.listActivities(sessionId);

      expect(activities[0].type).toBe("progress");
      expect(activities[0].content).toBe("Working on it...");
    });

    it("should extract git patch from artifacts", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-3",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            agentMessaged: { message: "Here is the code" },
            artifacts: [
              {
                changeSet: {
                  gitPatch: {
                    unidiffPatch: "diff --git a/file.ts b/file.ts",
                  },
                },
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const activities = await client.listActivities(sessionId);

      expect(activities[0].diff).toBe("diff --git a/file.ts b/file.ts");
    });

    it("should extract bash output from artifacts", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-4",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            progressUpdated: { message: "Running command" },
            artifacts: [
              {
                bashOutput: {
                  output: "Success\n",
                },
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const activities = await client.listActivities(sessionId);

      expect(activities[0].bashOutput).toBe("Success\n");
    });
  });

  describe('listActivitiesPaged', () => {
    it('should return activities and next page token', async () => {
      const mockResponse = {
        activities: [
          { name: 'sessions/123/activities/1', createTime: '2023-01-01T00:00:00Z' },
          { name: 'sessions/123/activities/2', createTime: '2023-01-01T00:00:01Z' },
        ],
        nextPageToken: 'next-token',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.listActivitiesPaged('session-123', 10, 'prev-token');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/jules?path=%2Fsessions%2Fsession-123%2Factivities%3FpageSize%3D10%26pageToken%3Dprev-token'),
        expect.any(Object)
      );
      expect(result.activities).toHaveLength(2);
      expect(result.nextPageToken).toBe('next-token');
      expect(result.activities[0].id).toBe('1');
    });
  });

  describe("Error Handling", () => {
    it("should throw JulesAPIError on 401", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Unauthorized" } }),
      });

      await expect(client.listSessions()).rejects.toThrow(JulesAPIError);
      await expect(client.listSessions()).rejects.toThrow("Invalid API key");
    });

    it("should throw JulesAPIError on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(client.listSessions()).rejects.toThrow(JulesAPIError);
      await expect(client.listSessions()).rejects.toThrow("Unable to connect");
    });
  });
});
