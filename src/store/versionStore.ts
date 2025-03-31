import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VersionState {
    version: string;
    lastBuildType: string;
    setVersion: (version: string, buildType: string) => void;
}

export const useVersionStore = create<VersionState>()(
    persist(
        (set) => ({
            version: '5.2.0', // Updated version number
            lastBuildType: 'major',
            setVersion: (version, buildType) => set({ version, lastBuildType: buildType }),
        }),
        {
            name: 'version-storage',
        }
    )
);
