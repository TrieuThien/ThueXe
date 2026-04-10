import { create } from 'zustand';

type UiState = {
  bootstrapping: boolean;
  globalLoadingCount: number;
  setBootstrapping: (value: boolean) => void;
  beginLoading: () => void;
  endLoading: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  bootstrapping: true,
  globalLoadingCount: 0,
  setBootstrapping: (value) => set({ bootstrapping: value }),
  beginLoading: () => set((state) => ({ globalLoadingCount: state.globalLoadingCount + 1 })),
  endLoading: () =>
    set((state) => ({
      globalLoadingCount: Math.max(0, state.globalLoadingCount - 1)
    }))
}));
