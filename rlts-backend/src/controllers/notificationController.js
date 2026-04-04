const Notification = require('../models/Notification');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');

/**
 * GET /api/notifications — Get user's notifications (paginated)
 */
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved',
      data: notifications,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read — Mark single notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return sendError(res, 404, 'Notification not found.');
    }

    sendSuccess(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/read-all — Mark all notifications as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    sendSuccess(res, 200, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
