import { useCallback } from 'react';
import { soundEffects } from './soundEffects';

export const useSoundEffects = () => {
  const playClick = useCallback(() => soundEffects.click(), []);
  const playHover = useCallback(() => soundEffects.hover(), []);
  const playSuccess = useCallback(() => soundEffects.success(), []);
  const playError = useCallback(() => soundEffects.error(), []);
  const playNotification = useCallback(() => soundEffects.notification(), []);
  const playOpen = useCallback(() => soundEffects.open(), []);
  const playClose = useCallback(() => soundEffects.close(), []);

  return {
    playClick,
    playHover,
    playSuccess,
    playError,
    playNotification,
    playOpen,
    playClose,
  };
};
