import { FAMILIES } from '../data/families';
import {
  applyAction,
  canActivateSkill,
  cannonTargets,
  flankState,
  flankTargets,
  swordTargets,
  upliftTargets,
  turncoatTargets,
  legalDrops,
  legalMoves,
  pullSources,
  pullTargets,
  shooters,
  shootTargets,
  spawnTargets,
} from './game';
import type { Action, GameState, Piece, Pos } from './types';

/** 1手番ぶんの操作 (必殺技なら複数の操作) と、その結果の局面 */
export interface Turn {
  actions: Action[];
  result: GameState;
}

const ENDABLE = new Set(['double', 'kingDouble', 'arrows', 'drop2', 'pull']);

function ownPieces(state: GameState): Pos[] {
  const out: Pos[] = [];
  state.board.forEach((row, y) =>
    row.forEach((p, x) => {
      if (p && p.owner === state.turn) out.push({ x, y });
    }),
  );
  return out;
}

/** 持ち駒は同じ種類なら働きが同じなので、種類ごとに1枚だけ試す */
function distinctHand(state: GameState): Piece[] {
  const seen = new Set<string>();
  return state.hands[state.turn].filter((p) => {
    if (seen.has(p.kind)) return false;
    seen.add(p.kind);
    return true;
  });
}

/** 一夜城の打ち先は、相手の駒のとなりに絞る (全部試すと多すぎるため) */
function nearEnemy(state: GameState, squares: Pos[]): Pos[] {
  const near = squares.filter((sq) =>
    state.board.some((row, y) => row.some((p, x) => p && p.owner !== state.turn && Math.abs(x - sq.x) <= 1 && Math.abs(y - sq.y) <= 1)),
  );
  return near.length > 0 ? near : squares;
}

/** 必殺技の途中の局面から、その手番の終わりまでの続きをすべて並べる */
function expand(state: GameState, start: GameState, prefix: Action[], out: Turn[]) {
  const finished = state.turn !== start.turn || state.winner !== null || state.draw;
  if (finished || !state.skillPhase) {
    if (finished) out.push({ actions: prefix, result: state });
    return;
  }
  const phase = state.skillPhase;
  const next = (action: Action) => expand(applyAction(state, action), start, [...prefix, action], out);

  switch (phase.type) {
    case 'shoot':
      for (const from of shooters(state)) for (const to of shootTargets(state, from)) next({ type: 'shoot', from, to });
      break;
    case 'pull':
      if (phase.step === 1) {
        for (const from of pullSources(state)) for (const to of pullTargets(state, from)) next({ type: 'pull', from, to });
      } else {
        for (const from of ownPieces(state)) for (const to of legalMoves(state, from)) next({ type: 'move', from, to });
      }
      break;
    case 'spawn':
      for (const to of spawnTargets(state)) next({ type: 'spawn', to });
      break;
    case 'naiou':
      for (const at of turncoatTargets(state)) next({ type: 'turncoat', at });
      break;
    case 'cannon':
      for (const to of cannonTargets(state)) next({ type: 'bombard', to });
      break;
    case 'sword':
      for (const to of swordTargets(state)) next({ type: 'strike', to });
      break;
    case 'gekokujo':
      if (phase.step === 1) {
        for (const at of upliftTargets(state)) next({ type: 'uplift', at });
      } else {
        for (const from of ownPieces(state)) for (const to of legalMoves(state, from)) next({ type: 'move', from, to });
      }
      break;
    case 'flank': {
      // 挟み撃ち: 置く (持ち駒の種類ごと) と、ふつうの1手 (動かす・相手の近くに打つ) の、まだしていないほう
      const fs = flankState(state);
      if (!fs.placed) for (const p of distinctHand(state)) for (const to of flankTargets(state, p.id)) next({ type: 'flank', pieceId: p.id, to });
      if (!fs.acted) {
        for (const from of ownPieces(state)) for (const to of legalMoves(state, from)) next({ type: 'move', from, to });
        for (const p of distinctHand(state)) for (const to of nearEnemy(state, legalDrops(state, p.id))) next({ type: 'drop', pieceId: p.id, to });
      }
      break;
    }
    case 'drop2':
      for (const p of distinctHand(state)) for (const to of nearEnemy(state, legalDrops(state, p.id))) next({ type: 'drop', pieceId: p.id, to });
      break;
    default:
      for (const from of ownPieces(state)) for (const to of legalMoves(state, from)) next({ type: 'move', from, to });
  }
  if (ENDABLE.has(phase.type) && phase.step >= 2) next({ type: 'endSkill' });
}

/** 普通の手 (駒を動かす・持ち駒を打つ) を並べる */
function normalTurns(state: GameState, prefix: Action[], out: Turn[]) {
  for (const from of ownPieces(state))
    for (const to of legalMoves(state, from)) {
      const action: Action = { type: 'move', from, to };
      out.push({ actions: [...prefix, action], result: applyAction(state, action) });
    }
  for (const p of distinctHand(state))
    for (const to of legalDrops(state, p.id)) {
      const action: Action = { type: 'drop', pieceId: p.id, to };
      out.push({ actions: [...prefix, action], result: applyAction(state, action) });
    }
}

/**
 * いまの手番で指せるすべての手番を並べる。
 * skills=false なら必殺技を使わない手だけ
 */
export function listTurns(state: GameState, skills = true): Turn[] {
  const out: Turn[] = [];
  if (state.winner !== null || state.draw) return out;
  normalTurns(state, [], out);
  if (!skills || !canActivateSkill(state)) return out;

  const activate: Action = { type: 'activateSkill' };
  const after = applyAction(state, activate);
  const type = FAMILIES[state.families[state.turn]].skill.type;
  if (type === 'shield' || type === 'fort') {
    // 小田原城は手番を使わないので、そのあと普通の手を指す
    normalTurns(after, [activate], out);
  } else if (type === 'undo') {
    out.push({ actions: [activate], result: after });
  } else {
    expand(after, state, [activate], out);
  }
  return out;
}
