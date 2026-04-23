const mockRedis = {
    rpush: jest.fn().mockResolvedValue(1),
    ltrim: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn().mockResolvedValue(1),
    lrange: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
  };
  
  jest.mock('../../db/redis', () => mockRedis);
  jest.mock('../../observability/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }));
  
  const { bufferEvent, getBufferedEvents, clearBufferedEvents } = require('../../services/eventBuffer');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('eventBuffer', () => {
    describe('bufferEvent', () => {
      test('pushes event to Redis list', async () => {
        await bufferEvent(1, 'standup_score', { score: 85 });
        expect(mockRedis.rpush).toHaveBeenCalledWith(
          'events:1',
          expect.stringContaining('standup_score')
        );
      });
  
      test('stores event as valid JSON', async () => {
        await bufferEvent(1, 'test_event', { foo: 'bar' });
        const call = mockRedis.rpush.mock.calls[0];
        const payload = JSON.parse(call[1]);
        expect(payload.event).toBe('test_event');
        expect(payload.data).toEqual({ foo: 'bar' });
        expect(payload.id).toBeTruthy();
        expect(payload.timestamp).toBeTruthy();
      });
  
      test('trims list to max 50 events', async () => {
        await bufferEvent(1, 'test', {});
        expect(mockRedis.ltrim).toHaveBeenCalledWith('events:1', -50, -1);
      });
  
      test('sets TTL of 24 hours', async () => {
        await bufferEvent(1, 'test', {});
        expect(mockRedis.expire).toHaveBeenCalledWith('events:1', 60 * 60 * 24);
      });
  
      test('handles Redis errors gracefully without throwing', async () => {
        mockRedis.rpush.mockRejectedValueOnce(new Error('Redis down'));
        await expect(bufferEvent(1, 'test', {})).resolves.not.toThrow();
      });
    });
  
    describe('getBufferedEvents', () => {
      test('returns empty array when no events', async () => {
        mockRedis.lrange.mockResolvedValueOnce([]);
        const events = await getBufferedEvents(1);
        expect(events).toEqual([]);
      });
  
      test('returns parsed events', async () => {
        const stored = JSON.stringify({
          id: 'abc123',
          event: 'standup_score',
          data: { score: 90 },
          timestamp: new Date().toISOString(),
        });
        mockRedis.lrange.mockResolvedValueOnce([stored]);
  
        const events = await getBufferedEvents(1);
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe('standup_score');
        expect(events[0].data.score).toBe(90);
      });
  
      test('returns all events for user', async () => {
        const events = ['event1', 'event2', 'event3'].map((e) =>
          JSON.stringify({ id: e, event: e, data: {}, timestamp: new Date().toISOString() })
        );
        mockRedis.lrange.mockResolvedValueOnce(events);
  
        const result = await getBufferedEvents(1);
        expect(result).toHaveLength(3);
      });
  
      test('handles Redis error and returns empty array', async () => {
        mockRedis.lrange.mockRejectedValueOnce(new Error('Redis down'));
        const events = await getBufferedEvents(1);
        expect(events).toEqual([]);
      });
    });
  
    describe('clearBufferedEvents', () => {
      test('deletes the user events key', async () => {
        await clearBufferedEvents(1);
        expect(mockRedis.del).toHaveBeenCalledWith('events:1');
      });
  
      test('handles Redis error gracefully', async () => {
        mockRedis.del.mockRejectedValueOnce(new Error('Redis down'));
        await expect(clearBufferedEvents(1)).resolves.not.toThrow();
      });
    });
  });