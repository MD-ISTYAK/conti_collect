const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Create and store an in-app notification.
 * Also sends push notification if FCM is configured.
 */
const createNotification = async ({ userId, title, body, type, complaintId, channels = ['in_app'] }) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      body,
      type,
      complaintId: complaintId || null,
      channel: channels,
    });

    // TODO: Send FCM push notification when Firebase is configured
    // if (channels.includes('push')) {
    //   await sendPushNotification(userId, title, body);
    // }

    return notification;
  } catch (error) {
    logger.error(`Notification creation failed: ${error.message}`);
  }
};

/**
 * Create notifications for multiple users.
 */
const notifyMultiple = async (userIds, { title, body, type, complaintId, channels }) => {
  const promises = userIds.map(userId =>
    createNotification({ userId, title, body, type, complaintId, channels })
  );
  await Promise.allSettled(promises);
};

/**
 * Get unread notification count for a user.
 */
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, isRead: false });
};

module.exports = { createNotification, notifyMultiple, getUnreadCount };
