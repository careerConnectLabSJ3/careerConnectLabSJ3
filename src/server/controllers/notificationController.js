import Notification from '../models/notification.js';

// GET: Fetch active notifications for the logged-in user
export async function getMyNotifications(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await Notification.find({ 
      user: req.session.user.id, 
      isRead: false 
    }).sort({ createdAt: -1 }).populate('job', 'title company');

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

// PATCH: Dismiss (mark as read) a notification
export async function dismissNotification(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.session.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    res.json({ message: 'Notification dismissed', notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
}