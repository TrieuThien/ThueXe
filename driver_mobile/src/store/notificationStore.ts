import { create } from 'zustand';

type CountUpdater = number | ((prev: number) => number);

type NotificationState = {
  unreadCount: number;
  setUnreadCount: (value: CountUpdater) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (value) =>
    set((state) => ({
      unreadCount: typeof value === 'function' ? value(state.unreadCount) : value
    }))
}));
