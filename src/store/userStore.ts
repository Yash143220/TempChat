import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserState {
  userId: string;
  userName: string;
  userColor: string;
  currentRoom: string | null;
  theme: 'light' | 'dark';
  setUser: (name: string, color: string) => void;
  setCurrentRoom: (roomId: string | null) => void;
  toggleTheme: () => void;
  clearOldRooms: () => void;
}

const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getRandomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useStore = create<UserState>()(
  persist(
    (set) => ({
      userId: generateUserId(),
      userName: '', // Will not persist - always empty on new load
      userColor: getRandomColor(),
      currentRoom: null,
      theme: 'dark',
      setUser: (name, color) => set({ userName: name, userColor: color }),
      setCurrentRoom: (roomId) => set({ currentRoom: roomId }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      clearOldRooms: () => {
        // Clear old room data from localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('room_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      },
    }),
    {
      name: 'ephemeral-chat-storage',
    }
  )
);
