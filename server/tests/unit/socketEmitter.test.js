jest.mock('../../services/eventBuffer', () => ({
    bufferEvent: jest.fn().mockResolvedValue(undefined),
  }));
  
  jest.mock('../../observability/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }));
  
  const { bufferEvent } = require('../../services/eventBuffer');
  const { emitToUser } = require('../../services/socketEmitter');
  
  const makeIo = (socketCount = 1) => ({
    in: jest.fn().mockReturnValue({
      fetchSockets: jest.fn().mockResolvedValue(
        Array(socketCount).fill({ id: 'socket1' })
      ),
    }),
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  });
  
  beforeEach(() => jest.clearAllMocks());
  
  describe('socketEmitter', () => {
    test('always buffers the event regardless of connection state', async () => {
      const io = makeIo(0); // user not connected
      await emitToUser(io, 1, 'test_event', { data: 'value' });
      expect(bufferEvent).toHaveBeenCalledWith(1, 'test_event', { data: 'value' });
    });
  
    test('emits to connected user via WebSocket', async () => {
      const io = makeIo(1);
      await emitToUser(io, 1, 'standup_score', { score: 85 });
  
      expect(io.to).toHaveBeenCalledWith('user:1');
      expect(io.to().emit).toHaveBeenCalledWith('standup_score', { score: 85 });
    });
  
    test('does not emit when user is not connected', async () => {
      const io = makeIo(0); // no sockets
      await emitToUser(io, 1, 'standup_score', { score: 85 });
  
      expect(io.to).not.toHaveBeenCalled();
    });
  
    test('emits to multiple connected sockets of same user', async () => {
      const io = makeIo(3); 
      await emitToUser(io, 1, 'notification', { message: 'test' });
  
      expect(io.to).toHaveBeenCalledWith('user:1');
      expect(io.to().emit).toHaveBeenCalledTimes(1);
    });
  
    test('buffers first even when emit succeeds', async () => {
      const io = makeIo(2);
      await emitToUser(io, 42, 'pr_reminder', { pr: 'test' });
  
      expect(bufferEvent).toHaveBeenCalledWith(42, 'pr_reminder', { pr: 'test' });
      expect(io.to).toHaveBeenCalledWith('user:42');
    });
  });