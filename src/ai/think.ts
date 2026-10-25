import type { Action, GameState } from '../engine/types';
import { chooseTurn, type CpuLevel } from './cpu';

let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, (actions: Action[]) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('./cpu.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; actions: Action[] }>) => {
      waiting.get(e.data.id)?.(e.data.actions);
      waiting.delete(e.data.id);
    };
    return worker;
  } catch {
    return null;
  }
}

/** CPU の手を考える。Web Worker が使えなければ、その場で考える */
export function think(state: GameState, level: CpuLevel): Promise<Action[]> {
  const w = getWorker();
  if (!w) return Promise.resolve(chooseTurn(state, level));
  const id = ++seq;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    w.postMessage({ id, state, level });
  });
}
