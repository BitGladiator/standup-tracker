const { bufferEvent } = require('./eventBuffer');
const logger = require('../observability/logger');


const emitToUser = async (io, userId, event, data) => {
  
  await bufferEvent(userId, event, data);

  
  const room = `user:${userId}`;
  const sockets = await io.in(room).fetchSockets();

  if (sockets.length > 0) {
    io.to(room).emit(event, data);
    logger.debug('Event emitted to connected user', { userId, event, socketCount: sockets.length });
  } else {
    logger.debug('User not connected — event buffered only', { userId, event });
  }
};

module.exports = { emitToUser };