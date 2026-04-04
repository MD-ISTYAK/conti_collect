const logger = require('../utils/logger');

let io = null;

/**
 * Initialize Socket.IO with the HTTP server.
 */
const initSocket = (server) => {
  const { Server } = require('socket.io');
  
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Client joins their personal notification room
    socket.on('join:room', ({ userId, role }) => {
      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);
      if (role === 'admin') {
        socket.join('admin-room');
      }
      logger.debug(`User ${userId} (${role}) joined rooms`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

/**
 * Get the Socket.IO instance.
 */
const getIO = () => io;

/**
 * Emit complaint status change to relevant users.
 */
const emitStatusChange = (complaintId, newStatus, dealerId) => {
  if (!io) return;
  
  io.to(`user:${dealerId}`).to('admin-room').emit('complaint:status_changed', {
    complaintId,
    newStatus,
    timestamp: new Date(),
  });
};

/**
 * Emit new complaint notification to admins.
 */
const emitNewComplaint = (complaintId, dealerName) => {
  if (!io) return;
  io.to('admin-room').emit('complaint:new', { complaintId, dealerName });
};

/**
 * Emit pickup completed event.
 */
const emitPickupCompleted = (complaintId, cfaName, dealerId) => {
  if (!io) return;
  io.to(`user:${dealerId}`).to('admin-room').emit('pickup:completed', {
    complaintId,
    cfaName,
    time: new Date(),
  });
};

/**
 * Emit dashboard stats update to admins.
 */
const emitDashboardUpdate = () => {
  if (!io) return;
  io.to('admin-room').emit('dashboard:stats_updated', { timestamp: new Date() });
};

/**
 * Emit new notification to specific user.
 */
const emitNotification = (userId, notification) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
};

module.exports = {
  initSocket,
  getIO,
  emitStatusChange,
  emitNewComplaint,
  emitPickupCompleted,
  emitDashboardUpdate,
  emitNotification,
};
