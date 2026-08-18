/**
 * useCountdown.js
 * Re-renders once a second so a deadline label stays live.
 * It stops ticking once the deadline has passed so idle cards cost nothing.
 */

import { useEffect, useState } from 'react';
import { formatCountdown } from '../utils/format';

export default function useCountdown(deadlineIso) {
  const [state, setState] = useState(() => formatCountdown(deadlineIso));

  useEffect(() => {
    setState(formatCountdown(deadlineIso));
    if (!deadlineIso) return undefined;

    const id = setInterval(() => {
      const next = formatCountdown(deadlineIso);
      setState(next);
      if (next.expired) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [deadlineIso]);

  return state;
}
