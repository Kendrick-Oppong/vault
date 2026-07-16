import { useShallow } from "zustand/react/shallow";
import { useNotificationsStore } from "./notifications.store";

export const useNotificationsState = () => {
  return useNotificationsStore(
    useShallow((state) => ({
      notifications: state.notifications
    }))
  );
};

export const useNotificationsActions = () => {
  return useNotificationsStore(
    useShallow((state) => ({
      add: state.add,
      remove: state.remove,
      clear: state.clear
    }))
  );
};

export const selectNotifications = (state: any) => state.notifications;
