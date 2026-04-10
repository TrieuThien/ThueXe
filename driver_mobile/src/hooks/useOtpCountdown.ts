import { useEffect, useMemo, useState } from 'react';

export const useOtpCountdown = (initialSeconds: number) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const mmss = useMemo(() => {
    const mm = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, '0');
    const ss = (secondsLeft % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  return {
    secondsLeft,
    formatted: mmss,
    reset: (value: number) => setSecondsLeft(value)
  };
};
