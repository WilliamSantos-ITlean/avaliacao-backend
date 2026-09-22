import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setTrafficReporter, type TrafficEntry } from './api';

type TrafficValue = {
  entries: TrafficEntry[];
  clear: () => void;
};

const TrafficContext = createContext<TrafficValue>({ entries: [], clear: () => {} });

export function TrafficProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<TrafficEntry[]>([]);

  useEffect(() => {
    setTrafficReporter((entry) => {
      setEntries((current) => [entry, ...current].slice(0, 12));
    });
    return () => setTrafficReporter(() => {});
  }, []);

  const value = useMemo(
    () => ({
      entries,
      clear: () => setEntries([]),
    }),
    [entries],
  );

  return <TrafficContext.Provider value={value}>{children}</TrafficContext.Provider>;
}

export function useTraffic() {
  return useContext(TrafficContext);
}
