import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Ride } from '../types';

interface RideState {
  currentRide: Ride | null;
  isTracking: boolean;
  startTracking: (ride: Ride) => void; // Accepts a ride object
  stopTracking: () => void;
  updateCurrentRide: (data: Partial<Ride>) => void;
}

export const useRideStore = create<RideState>()(
  persist(
    (set) => ({
      currentRide: null,
      isTracking: false,
      startTracking: (ride) => set({ isTracking: true, currentRide: ride }),
      stopTracking: () => set({ isTracking: false, currentRide: null }),
      updateCurrentRide: (data) =>
        set((state) => ({
          currentRide: state.currentRide
            ? { ...state.currentRide, ...data }
            : null,
        })),
    }),
    {
      name: 'ride-storage',
    }
  )
);