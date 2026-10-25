import { isKingInDanger, opponent } from '../engine/game';
import { listTurns, type Turn } from '../engine/turns';
import type { Action, GameState, Kind, Piece, Side } from '../engine/types';

export type CpuLevel = 'weak' | 'normal';

/** CPU と対戦するときの設定。CPU が指す側と強さ */
export interface CpuSetting {
  side: Side;
  level: CpuLevel;
}

export const LEVEL_LABEL: Record<CpuLevel, string> = { weak: 'よわい', normal: 'ふつう' };

const WIN = 1_000_000;

/** 駒の価値。3×4 は金=たて・よこ、銀=ななめ なので少し低め */
const VALUE: Record<GameState['variant'], Record<Kind, number>> = {
  large: { K: 0, G: 6, S: 5, P: 1 },
  small: { K: 0, G: 5, S: 4, P: 1 },
};
const PROMOTED = 6;
/** 持ち駒は、どこにでも打てるぶん少し高く数える */
const HAND_BONUS = 1.15;
/** 必殺技は使わずに持っているだけでも価値がある (ささいな得のために使わないように) */
const SKILL_KEPT = 1.5;

const pieceValue = (state: GameState, p: Piece) => (p.promoted ? PROMOTED : VALUE[state.variant][p.kind]);

/**
 * 局面の点数 (side から見て)。
 * 大将を取った・取られたは決着として大きく、ほかは駒の損得と少しの位置の良し悪し
 */
export function evaluate(state: GameState, side: Side): number {
  const opp = opponent(side);
  if (state.winner === side) return WIN;
  if (state.winner === opp) return -WIN;
  if (state.draw) return 0;

  let score = 0;
  state.board.forEach((row, y) =>
    row.forEach((p) => {
      if (!p) return;
      const sign = p.owner === side ? 1 : -1;
      let v = pieceValue(state, p);
      // 前に進んだ足軽は少しだけ高く
      const advanced = p.owner === 'sente' ? state.rows - 1 - y : y;
      if (p.kind === 'P' && !p.promoted) v += 0.08 * advanced;
      // 3×4 は大将が相手の陣に近いほどトライに近い
      if (p.kind === 'K' && state.variant === 'small') v += 0.25 * advanced;
      score += sign * v;
    }),
  );
  for (const s of [side, opp] as Side[]) {
    const sign = s === side ? 1 : -1;
    for (const p of state.hands[s]) score += sign * pieceValue(state, p) * HAND_BONUS;
    if (!state.skillUsed[s]) score += sign * SKILL_KEPT;
  }

  // 次に指す側が、相手の大将を取れる位置にいるか
  const mover = state.turn;
  const other = opponent(mover);
  if (isKingInDanger(state, other)) score += (mover === side ? 1 : -1) * 800;
  else if (isKingInDanger(state, mover)) score += (mover === side ? -1 : 1) * 0.6;
  return score;
}

/** 大将を取る手・駒を取る手を先に試すと、読みの枝刈りが効きやすい */
function order(turns: Turn[], side: Side): Turn[] {
  return turns
    .map((t) => ({ t, s: evaluate(t.result, side) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

/** 0 を中心にした、ばらつきのある乱数 (おおよそ正規分布) */
function noise(rng: () => number, size: number) {
  return (rng() + rng() + rng() - 1.5) * size;
}

/** 局面から読みを始めるための準備 (鳴くまで待とう用の保存を省いて速くする) */
function searchRoot(state: GameState): GameState {
  return { ...state, search: true, thisTurnStart: null };
}

/**
 * CPU の手を選ぶ。返り値は、その手番に行う操作の並び。
 * - weak:   1手だけ読み、大きなばらつきを入れる (取れる大将は取るが、うっかりも多い)
 * - normal: 自分の手と相手の返しの2手を読む
 */
export function chooseTurn(state: GameState, level: CpuLevel, rng: () => number = Math.random): Action[] {
  const side = state.turn;
  const root = searchRoot(state);
  const turns = listTurns(root);
  if (turns.length === 0) return [];

  // 大将を取れるなら、どの強さでも必ず取る
  const winning = turns.find((t) => t.result.winner === side);
  if (winning) return winning.actions;

  if (level === 'weak') {
    let best: Turn = turns[0];
    let bestScore = -Infinity;
    for (const t of turns) {
      const s = evaluate(t.result, side) + noise(rng, 3);
      if (s > bestScore) {
        bestScore = s;
        best = t;
      }
    }
    return best.actions;
  }

  // normal: 2手読み (アルファベータ法で、相手の返しの読みを途中で打ち切る)
  let best: Turn = turns[0];
  let alpha = -Infinity;
  for (const t of order(turns, side)) {
    let worst = Infinity;
    if (t.result.winner !== null || t.result.draw || t.result.turn === side) {
      worst = evaluate(t.result, side);
    } else {
      const replies = order(listTurns(t.result), opponent(side));
      for (const r of replies) {
        const s = evaluate(r.result, side);
        if (s < worst) worst = s;
        if (worst <= alpha) break;
      }
      if (replies.length === 0) worst = evaluate(t.result, side);
    }
    const scored = worst + noise(rng, 0.3);
    if (scored > alpha) {
      alpha = scored;
      best = t;
    }
  }
  return best.actions;
}
