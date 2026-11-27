import { jest, test, describe, beforeEach, afterEach } from '@jest/globals';
import Notification from '../models/notification.js';
import { getMyNotifications, dismissNotification } from '../controllers/notificationController.js';

// Helper to fake Express response
function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { 
        this.statusCode = code; 
        return this; 
    },
    json(body) { 
        this.body = body; 
        return this; 
    }
  };
}

describe('Notification Controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('returns 401 if user is not logged in', async () => {
    const res = response();
    await getMyNotifications({ session: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  test('fetches unread notifications for the logged-in user', async () => {
    const mockNotifs = [{ _id: '1', message: 'Test', isRead: false }];
    jest.spyOn(Notification, 'find').mockReturnValue({
      sort: () => ({ populate: async () => mockNotifs })
    });

    const res = response();
    await getMyNotifications({ session: { user: { id: 'user-123' } } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockNotifs);
  });

  test('dismisses a notification securely', async () => {
    const mockNotif = { _id: 'notif-1', isRead: true };
    jest.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(mockNotif);

    const res = response();
    await dismissNotification({ session: { user: { id: 'user-123' } }, params: { id: 'notif-1' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Notification dismissed');
  });
});