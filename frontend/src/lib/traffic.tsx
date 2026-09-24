import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setTrafficReporter, type TrafficEntry } from './api';
import { useAuth } from './auth';

type TrafficValue = {
  entries: TrafficEntry[];
  clear: () => void;
};

const TrafficContext = createContext<TrafficValue>({ entries: [], clear: () => {} });

export function TrafficProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [entries, setEntries] = useState<TrafficEntry[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      setEntries([]);
      setTrafficReporter(() => {});
      return;
    }

    setTrafficReporter((entry) => {
      setEntries((current) => [entry, ...current].slice(0, 12));
    });
    return () => setTrafficReporter(() => {});
  }, [isAdmin]);

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
