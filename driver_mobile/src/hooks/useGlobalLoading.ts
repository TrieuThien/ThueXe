import { useUiStore } from '../store/uiStore';

export const useGlobalLoading = () => {
  const globalLoadingCount = useUiStore((state) => state.globalLoadingCount);
  const beginLoading = useUiStore((state) => state.beginLoading);
  const endLoading = useUiStore((state) => state.endLoading);

  return {
    isLoading: globalLoadingCount > 0,
    beginLoading,
    endLoading
  };
};
