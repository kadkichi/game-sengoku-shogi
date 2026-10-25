/// <reference lib="webworker" />
import { chooseTurn, type CpuLevel } from './cpu';
import type { GameState } from '../engine/types';

/** 画面とは別の場所 (Web Worker) で CPU に考えさせ、画面が固まらないようにする */
self.onmessage = (e: MessageEvent<{ id: number; state: GameState; level: CpuLevel }>) => {
  const { id, state, level } = e.data;
  const actions = chooseTurn(state, level);
  (self as DedicatedWorkerGlobalScope).postMessage({ id, actions });
};
