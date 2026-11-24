"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export function useAfterMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

type RenderFn = () => React.ReactNode;

type DetailApi = {
  publish: (fn: RenderFn) => void;
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
  current: () => React.ReactNode;
};

const DetailContext = createContext<DetailApi | null>(null);

export function DetailProvider({ children }: { children: React.ReactNode }) {
  const renderRef = useRef<RenderFn | null>(null);
  const listeners = useRef(new Set<() => void>());
  const api = useMemo<DetailApi>(
    () => ({
      publish(fn) {
        renderRef.current = fn;
        listeners.current.forEach((listener) => listener());
      },
      clear() {
        renderRef.current = null;
        listeners.current.forEach((listener) => listener());
      },
      subscribe(listener) {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
      current() {
        return renderRef.current ? renderRef.current() : null;
      },
    }),
    [],
  );
  return <DetailContext.Provider value={api}>{children}</DetailContext.Provider>;
}

export function usePublishDetail(node: React.ReactNode, signature: string, active: boolean) {
  const api = useContext(DetailContext);
  const nodeRef = useRef(node);
  nodeRef.current = node;
  useLayoutEffect(() => {
    if (!api || !active) return;
    api.publish(() => nodeRef.current);
    return () => api.clear();
  }, [api, active, signature]);
}

export function DetailSlot({ fallback }: { fallback: React.ReactNode }) {
  const api = useContext(DetailContext);
  const [, setTick] = useState(0);
  useLayoutEffect(() => {
    if (!api) return;
    const unsubscribe = api.subscribe(() => setTick((value) => value + 1));
    setTick((value) => value + 1);
    return unsubscribe;
  }, [api]);
  const published = api?.current() ?? null;
  return <>{published || fallback}</>;
}
