import { useSyncExternalStore } from 'react';

/**
 * A lightweight, Zustand-like global state manager for React without external dependencies.
 */
export function createStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<(state: T, prevState: T) => void>();

  const getState = () => state;

  const setState = (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace = false
  ) => {
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: T) => Partial<T>)(state)
        : partial;
    
    if (nextState !== state) {
      const prevState = state;
      state = replace
        ? (nextState as T)
        : { ...state, ...nextState };
      listeners.forEach((listener) => listener(state, prevState));
    }
  };

  const subscribe = (listener: (state: T, prevState: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // The custom hook
  const useStore = <U>(selector: (state: T) => U): U => {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state) // Server snapshot (same as client for CSR)
    );
  };

  return { getState, setState, subscribe, useStore };
}
