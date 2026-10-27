import { FAMILIES, type FamilyId, type SkillType } from '../data/families';
import type { Action, Cell, GameEvent, GameState, Kind, Piece, Pos, Side, Snapshot, Variant } from './types';

export const SIZES: Record<Variant, { cols: number; rows: number }> = {
  small: { cols: 3, rows: 4 },
  large: { cols: 5, rows: 6 },
};

/** 先手から見た動き (dy=-1 が前) */
const VECTORS: Record<Variant, Record<Kind, [number, number][]>> = {
  // 5×6: 金・銀は本将棋の金将・銀将と同じ動き
  large: {
    K: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
    G: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]],
    S: [[-1, -1], [0, -1], [1, -1], [-1, 1], [1, 1]],
    P: [[0, -1]],
    // 先鋒: 前・左・右
    V: [[0, -1], [-1, 0], [1, 0]],
  },
  // 3×4: 金=たて・よこ、銀=ななめ
  small: {
    K: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
    G: [[0, -1], [-1, 0], [1, 0], [0, 1]],
    S: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    P: [[0, -1]],
    V: [[0, -1], [-1, 0], [1, 0]],
  },
};
/** 成った駒 (どちらのモードも 5×6 の金の動き) */
const PROMOTED: [number, number][] = VECTORS.large.G;
const DIAGONALS: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

export const opponent = (side: Side): Side => (side === 'sente' ? 'gote' : 'sente');
export const forward = (side: Side): number => (side === 'sente' ? -1 : 1);
export const samePos = (a: Pos, b: Pos): boolean => a.x === b.x && a.y === b.y;
export const inBounds = (state: Pick<GameState, 'cols' | 'rows'>, p: Pos): boolean =>
  p.x >= 0 && p.x < state.cols && p.y >= 0 && p.y < state.rows;
export const skillTypeOf = (state: GameState, side: Side): SkillType => FAMILIES[state.families[side]].skill.type;

/** 一番奥の段 */
export const isLastRank = (state: Pick<GameState, 'rows'>, side: Side, p: Pos): boolean =>
  side === 'sente' ? p.y === 0 : p.y === state.rows - 1;

/** 敵陣。5×6 は奥2段、3×4 は一番奥の段だけ */
export const inEnemyZone = (state: Pick<GameState, 'rows' | 'variant'>, side: Side, p: Pos): boolean => {
  const depth = state.variant === 'large' ? 2 : 1;
  return side === 'sente' ? p.y < depth : p.y >= state.rows - depth;
};

/** 成れる駒。3×4 は足軽だけ。5×6 は足軽・銀・先鋒 */
const canPromote = (variant: Variant, kind: Kind) => kind === 'P' || (variant === 'large' && (kind === 'S' || kind === 'V'));

/** 動ける方向 (盤上の向き。先手は上が前) */
export const directions = (piece: Piece, variant: Variant): [number, number][] => {
  const f = forward(piece.owner);
  const vecs = piece.promoted ? PROMOTED : VECTORS[variant][piece.kind];
  return vecs.map(([dx, dy]) => [dx * -f, dy * -f]);
};

/**
 * まっすぐ前に何マスでも進む技 (真田の六文銭・西軍の島津の退き口) を使える駒か。
 * 自分の家の、決まった1人だけ (寝返った駒や、相手の同じ家の駒は使えない)
 */
export const isChargeUnit = (state: GameState, piece: Piece | null, side: Side): boolean => {
  const skill = FAMILIES[state.families[side]].skill;
  return (
    !!piece && skill.type === 'charge' && piece.owner === side && piece.name === skill.unit && piece.originFamily === state.families[side]
  );
};

/** 内応の密書: 寝返らせられる相手の駒の位置 (盤上の相手側にいる 寝返り候補) */
export function turncoatTargets(state: GameState): Pos[] {
  const side = state.turn;
  const names = FAMILIES[state.families[side]].skill.turncoats ?? [];
  const out: Pos[] = [];
  forEachPiece(state, (piece, at) => {
    if (piece.owner !== side && names.includes(piece.name) && !isForbidden(state, { type: 'turncoat', at })) out.push(at);
  });
  return out;
}

/** 決まった1人 (skill.unit) の位置。自分の家の その武将だけ */
function findUnit(state: GameState, side: Side): Pos | null {
  let found: Pos | null = null;
  forEachPiece(state, (piece, at) => {
    if (isChargeUnit(state, piece, side) || isFortUnit(state, piece, side)) found = at;
  });
  return found;
}

const isFortUnit = (state: GameState, piece: Piece, side: Side): boolean => {
  const skill = FAMILIES[state.families[side]].skill;
  return skill.type === 'fort' && piece.owner === side && piece.name === skill.unit && piece.originFamily === state.families[side];
};

/** 挟み撃ち: 置いた駒の id (まだ置いていなければ null) と、ふつうの1手をもうしたか */
export const flankState = (state: GameState): { placed: string | null; acted: boolean } => {
  const moved = state.skillPhase?.type === 'flank' ? state.skillPhase.moved : [];
  const p = moved.find((m) => m.startsWith('placed:'));
  return { placed: p ? p.slice('placed:'.length) : null, acted: moved.includes('acted') };
};

/** 挟み撃ち: 敵の大将の 真後ろのマス (盤の中で、空いているとき) */
export function flankSquare(state: GameState): Pos | null {
  const enemy = opponent(state.turn);
  const king = findKing(state, enemy);
  if (!king) return null;
  const to = { x: king.x, y: king.y - forward(enemy) };
  return inBounds(state, to) && !pieceAt(state, to) ? to : null;
}

/** 挟み撃ち: この持ち駒を置けるマス (足軽は 一番奥の段には置けない) */
export function flankTargets(state: GameState, pieceId: string): Pos[] {
  if (state.skillPhase?.type !== 'flank' || flankState(state).placed) return [];
  const piece = state.hands[state.turn].find((p) => p.id === pieceId);
  const to = flankSquare(state);
  if (!piece || !to) return [];
  if (piece.kind === 'P' && isLastRank(state, state.turn, to)) return [];
  return [to];
}

/** 大筒の砲撃: 撃てる相手の駒 (相手の陣 = こちらから見た敵陣にいる、大将以外) */
export function cannonTargets(state: GameState): Pos[] {
  const side = state.turn;
  const out: Pos[] = [];
  forEachPiece(state, (piece, at) => {
    if (piece.owner !== side && piece.kind !== 'K' && inEnemyZone(state, side, at) && !isShielded(state, at) && !isForbidden(state, { type: 'bombard', to: at }))
      out.push(at);
  });
  return out;
}

export const pieceAt = (state: GameState, p: Pos): Cell => (inBounds(state, p) ? state.board[p.y][p.x] : null);

function snapshot(state: GameState): Snapshot {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { thisTurnStart, lastTurnStart, events, ...rest } = state;
  return structuredClone(rest);
}

export function createGame(families: Record<Side, FamilyId>, variant: Variant = 'large'): GameState {
  const { cols, rows } = SIZES[variant];
  const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
  let seq = 0;
  const make = (side: Side, kind: Kind, name: string): Piece => ({
    id: `${side}-${kind}-${seq++}`,
    kind,
    owner: side,
    promoted: false,
    name,
    originFamily: families[side],
  });

  for (const side of ['sente', 'gote'] as Side[]) {
    const fam = FAMILIES[families[side]];
    const back = side === 'sente' ? rows - 1 : 0;
    // 先手から見て左からの並び。後手は点対称
    let row: [Kind, string][];
    let pawns: number[];
    let pawnRow: number;
    if (variant === 'large') {
      row = [['S', fam.silver[1]], ['G', fam.gold[0]], ['K', fam.lord], ['G', fam.gold[1]], ['S', fam.silver[0]]];
      pawns = [1, 2, 3];
      pawnRow = side === 'sente' ? 3 : 2;
    } else {
      // 3×4: 手前の段は 左から 銀・大将・金。武将は 5×6 の金の武将2人を使う
      row = [['S', fam.gold[1]], ['K', fam.lord], ['G', fam.gold[0]]];
      pawns = [1];
      pawnRow = side === 'sente' ? 2 : 1;
    }
    if (side === 'gote') row = [...row].reverse();
    row.forEach(([kind, name], x) => {
      board[back][x] = make(side, kind, name);
    });
    // 合戦モードの軍は、足軽の代わりに名前のある先鋒を置く
    const front = variant === 'large' && fam.vanguard ? (side === 'gote' ? [...fam.vanguard].reverse() : fam.vanguard) : null;
    pawns.forEach((x, i) => {
      board[pawnRow][x] = front ? make(side, 'V', front[i]) : make(side, 'P', '足軽');
    });
  }

  const state: GameState = {
    variant,
    cols,
    rows,
    board,
    hands: { sente: [], gote: [] },
    turn: 'sente',
    families,
    skillUsed: { sente: false, gote: false },
    skillPhase: null,
    shield: null,
    forbidden: null,
    turnFirst: null,
    lastTurnFirst: null,
    thisTurnStart: null,
    lastTurnStart: null,
    winner: null,
    winReason: null,
    draw: false,
    moveCount: 0,
    positions: [],
    events: [],
  };
  state.positions.push(positionKey(state));
  state.thisTurnStart = snapshot(state);
  return state;
}

export function positionKey(state: GameState): string {
  const cells = state.board
    .map((row) => row.map((c) => (c ? `${c.owner[0]}${c.kind}${c.promoted ? '+' : ''}` : '..')).join(''))
    .join('/');
  const hand = (side: Side) =>
    state.hands[side]
      .map((p) => p.kind)
      .sort()
      .join('');
  return `${cells}|${hand('sente')}|${hand('gote')}|${state.turn}`;
}

function forEachPiece(state: GameState, fn: (piece: Piece, at: Pos) => void) {
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++) {
      const piece = state.board[y][x];
      if (piece) fn(piece, { x, y });
    }
}

function pseudoMoves(state: GameState, from: Pos): Pos[] {
  const piece = pieceAt(state, from);
  if (!piece) return [];
  const out: Pos[] = [];
  for (const [dx, dy] of directions(piece, state.variant)) {
    const to = { x: from.x + dx, y: from.y + dy };
    if (!inBounds(state, to)) continue;
    const target = pieceAt(state, to);
    if (target && target.owner === piece.owner) continue;
    out.push(to);
  }
  return out;
}

/** 飛び道具のような動き: 方向ごとに、空きマスを進み、最初の敵で止まる (取れる) */
function slide(state: GameState, from: Pos, dirs: [number, number][]): Pos[] {
  const piece = pieceAt(state, from);
  if (!piece) return [];
  const out: Pos[] = [];
  for (const [dx, dy] of dirs) {
    let p = { x: from.x + dx, y: from.y + dy };
    while (inBounds(state, p)) {
      const target = pieceAt(state, p);
      if (target) {
        if (target.owner !== piece.owner) out.push(p);
        break;
      }
      out.push(p);
      p = { x: p.x + dx, y: p.y + dy };
    }
  }
  return out;
}

const gameOver = (state: GameState) => state.winner !== null || state.draw;

/** 小田原城で守られている駒は取れない */
/** 守りの技で守られている駒か (小田原城総構え=全部の駒、真田丸=決まった1人と まわり8マス) */
export function isProtected(state: GameState, p: Pos): boolean {
  const target = pieceAt(state, p);
  if (!target || state.shield === null || target.owner !== state.shield) return false;
  if (FAMILIES[state.families[state.shield]].skill.type !== 'fort') return true;
  const unit = findUnit(state, state.shield);
  return !!unit && Math.abs(unit.x - p.x) <= 1 && Math.abs(unit.y - p.y) <= 1;
}

/** 小田原城総構え・真田丸で守られていて、いま取れない駒 */
const isShielded = (state: GameState, p: Pos) => state.shield !== state.turn && isProtected(state, p);

const isForbidden = (state: GameState, action: Action) => {
  const f = state.forbidden;
  if (!f || f.type !== action.type) return false;
  if ((f.type === 'move' || f.type === 'shoot' || f.type === 'pull') && 'from' in action && 'to' in action)
    return samePos(f.from, action.from) && samePos(f.to, action.to);
  if (f.type === 'turncoat' && action.type === 'turncoat') return samePos(f.at, action.at);
  if (f.type === 'bombard' && action.type === 'bombard') return samePos(f.to, action.to);
  if (f.type === 'drop' && action.type === 'drop') return f.pieceId === action.pieceId && samePos(f.to, action.to);
  if (f.type === 'spawn' && action.type === 'spawn') return samePos(f.to, action.to);
  return false;
};

/** 選んだ駒が動けるマス (必殺技の途中なら、その技の動き) */
export function legalMoves(state: GameState, from: Pos): Pos[] {
  if (gameOver(state)) return [];
  const piece = pieceAt(state, from);
  if (!piece || piece.owner !== state.turn) return [];
  const phase = state.skillPhase;
  let moves: Pos[];
  if (!phase) {
    moves = pseudoMoves(state, from);
  } else {
    switch (phase.type) {
      case 'double':
        if (piece.kind === 'K') return [];
        // 2かいめで 駒を とっても いい。ただし 大将は とれない
        moves = pseudoMoves(state, from);
        if (phase.step >= 2) moves = moves.filter((to) => pieceAt(state, to)?.kind !== 'K');
        break;
      case 'kingDouble':
        if (piece.kind !== 'K') return [];
        moves = pseudoMoves(state, from);
        // 3×4: 技の途中は、相手の一番奥の段 (トライの段) に入れない
        if (state.variant === 'small') moves = moves.filter((to) => !isLastRank(state, piece.owner, to));
        break;
      case 'arrows': {
        if (piece.kind === 'K' || phase.moved.includes(piece.id)) return [];
        const to = { x: from.x, y: from.y + forward(piece.owner) };
        moves = inBounds(state, to) && !pieceAt(state, to) ? [to] : [];
        break;
      }
      case 'pull':
        // 釣り野伏せ: 引き寄せたあとに、自分の駒を1回ふつうに動かせる
        if (phase.step < 2) return [];
        moves = pseudoMoves(state, from);
        break;
      case 'slideDiag':
        if (piece.kind === 'K') return [];
        moves = slide(state, from, DIAGONALS);
        break;
      case 'flank': {
        // 挟み撃ち: ふつうの1手。置いた駒は この手番 動けない
        const fs = flankState(state);
        if (fs.acted || piece.id === fs.placed) return [];
        moves = pseudoMoves(state, from);
        break;
      }
      case 'charge': {
        if (!isChargeUnit(state, piece, state.turn)) return [];
        const f = forward(piece.owner);
        const fan = FAMILIES[state.families[state.turn]].skill.chargeDirs === 'fan';
        moves = slide(state, from, fan ? [[-1, f], [0, f], [1, f]] : [[0, f]]);
        break;
      }
      default:
        return [];
    }
  }
  return moves.filter((to) => !isShielded(state, to) && !isForbidden(state, { type: 'move', from, to }));
}

/** 持ち駒を打てるマス */
export function legalDrops(state: GameState, pieceId: string): Pos[] {
  if (gameOver(state)) return [];
  if (state.skillPhase && state.skillPhase.type !== 'drop2' && !(state.skillPhase.type === 'flank' && !flankState(state).acted)) return [];
  const piece = state.hands[state.turn].find((p) => p.id === pieceId);
  if (!piece) return [];
  return emptySquares(state).filter(
    (to) => !(piece.kind === 'P' && isLastRank(state, state.turn, to)) && !isForbidden(state, { type: 'drop', pieceId, to }),
  );
}

function emptySquares(state: GameState): Pos[] {
  const out: Pos[] = [];
  for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) if (!state.board[y][x]) out.push({ x, y });
  return out;
}

/** 鉄砲三段撃ち / 東海一の弓取: この足軽が撃てるマス (前に1〜2マス。途中に駒があればそこで止まる。大将も撃てる) */
export function shootTargets(state: GameState, from: Pos): Pos[] {
  const piece = pieceAt(state, from);
  if (!piece || piece.owner !== state.turn || piece.kind !== 'P') return [];
  const f = forward(piece.owner);
  for (let step = 1; step <= 2; step++) {
    const to = { x: from.x, y: from.y + f * step };
    if (!inBounds(state, to)) return [];
    const target = pieceAt(state, to);
    if (!target) continue;
    if (target.owner === piece.owner || isShielded(state, to)) return [];
    if (isForbidden(state, { type: 'shoot', from, to })) return [];
    return [to];
  }
  return [];
}

/** 撃てる足軽の位置 */
export function shooters(state: GameState): Pos[] {
  const out: Pos[] = [];
  forEachPiece(state, (piece, at) => {
    if (piece.owner === state.turn && shootTargets(state, at).length > 0) out.push(at);
  });
  return out;
}

/** 釣り野伏せ: この相手の駒を引き寄せられるマス (こちら側へ1マス。空いているときだけ) */
export function pullTargets(state: GameState, from: Pos): Pos[] {
  const piece = pieceAt(state, from);
  if (!piece || piece.owner === state.turn || piece.kind === 'K') return [];
  const to = { x: from.x, y: from.y - forward(state.turn) };
  if (!inBounds(state, to) || pieceAt(state, to)) return [];
  if (isForbidden(state, { type: 'pull', from, to })) return [];
  return [to];
}

/** 引き寄せられる相手の駒の位置 */
export function pullSources(state: GameState): Pos[] {
  const out: Pos[] = [];
  forEachPiece(state, (piece, at) => {
    if (piece.owner !== state.turn && pullTargets(state, at).length > 0) out.push(at);
  });
  return out;
}

/** 一領具足: 新しい足軽を打てるマス */
export function spawnTargets(state: GameState): Pos[] {
  return emptySquares(state).filter((to) => !isLastRank(state, state.turn, to) && !isForbidden(state, { type: 'spawn', to }));
}

/** 必殺技の途中で、まだ動かせる駒があるか */
function hasAnySkillMove(state: GameState): boolean {
  let found = false;
  forEachPiece(state, (piece, at) => {
    if (!found && piece.owner === state.turn && legalMoves(state, at).length > 0) found = true;
  });
  return found;
}

export function canActivateSkill(state: GameState): boolean {
  if (gameOver(state) || state.skillPhase || state.skillUsed[state.turn]) return false;
  const type = skillTypeOf(state, state.turn);
  const trial: GameState = { ...state, skillPhase: { type, step: 1, moved: [] } };
  switch (type) {
    case 'shoot':
      return shooters(trial).length > 0;
    case 'double':
    case 'kingDouble':
    case 'arrows':
    case 'slideDiag':
    case 'charge':
      return hasAnySkillMove(trial);
    case 'naiou':
      return turncoatTargets(state).length > 0;
    case 'cannon':
      return cannonTargets(state).length > 0;
    case 'flank':
      return state.hands[state.turn].some((p) => flankTargets(trial, p.id).length > 0);
    case 'fort':
      return findUnit(state, state.turn) !== null;
    case 'drop2':
      return state.hands[state.turn].length >= 2 && legalDrops(trial, state.hands[state.turn][0].id).length > 0;
    case 'pull':
      return pullSources(trial).length > 0;
    case 'spawn':
      return spawnTargets(trial).length > 0;
    case 'shield':
      return true;
    case 'undo':
      return state.lastTurnStart !== null && state.lastTurnStart.turn === opponent(state.turn);
  }
}

export function findKing(state: GameState, side: Side): Pos | null {
  let king: Pos | null = null;
  forEachPiece(state, (piece, at) => {
    if (piece.owner === side && piece.kind === 'K') king = at;
  });
  return king;
}

/** その側の大将が、相手の駒に取られる位置にいるか */
export function isKingInDanger(state: GameState, side: Side): boolean {
  const king = findKing(state, side);
  if (!king) return false;
  if (state.shield === side && isProtected(state, king)) return false;
  let danger = false;
  forEachPiece(state, (piece, at) => {
    if (danger || piece.owner === side) return;
    if (pseudoMoves(state, at).some((to) => samePos(to, king))) danger = true;
  });
  return danger;
}

/** 3×4: その側の大将が相手の一番奥の段にいる (次の自分の番まで残ればトライで勝ち) */
export function isTrying(state: GameState, side: Side): boolean {
  if (state.variant !== 'small') return false;
  const king = findKing(state, side);
  return king !== null && isLastRank(state, side, king);
}

export function findPiece(state: GameState, pieceId: string): Pos | null {
  let found: Pos | null = null;
  forEachPiece(state, (piece, at) => {
    if (piece.id === pieceId) found = at;
  });
  return found;
}

export class IllegalAction extends Error {}

export function applyAction(prev: GameState, action: Action): GameState {
  const state: GameState = structuredClone(prev);
  state.events = [];
  const side = state.turn;
  const fam = state.families[side];
  const phase = state.skillPhase;
  const fail = (msg: string): never => {
    throw new IllegalAction(msg);
  };
  if (gameOver(state)) fail('game is over');

  /** 必殺技の最初の操作で、技を使ったことにする */
  const commit = () => {
    if (phase && phase.step === 1 && !state.skillUsed[side]) {
      state.skillUsed[side] = true;
      state.events.push({ type: 'skill', side, family: fam });
    }
    state.turnFirst ??= action;
  };

  switch (action.type) {
    case 'activateSkill': {
      if (!canActivateSkill(state)) fail('cannot activate skill');
      const type = skillTypeOf(state, side);
      if (type === 'shield' || type === 'fort') {
        state.skillUsed[side] = true;
        state.shield = side;
        state.events.push({ type: 'skill', side, family: fam }, { type: 'shield', side });
        return state;
      }
      if (type === 'undo') return undoLastTurn(state);
      state.skillPhase = { type, step: 1, moved: [] };
      return state;
    }
    case 'cancelSkill': {
      if (!phase || phase.step !== 1) fail('cannot cancel now');
      state.skillPhase = null;
      return state;
    }
    case 'endSkill': {
      // 挟み撃ちは、置く・ふつうの1手の 両方をするまで 終われない
      if (!phase || phase.step < 2 || phase.type === 'flank') fail('nothing to end');
      endTurn(state);
      return state;
    }
    case 'shoot': {
      if (phase?.type !== 'shoot') fail('not shooting');
      if (!shootTargets(state, action.from).some((p) => samePos(p, action.to))) fail('illegal shot');
      commit();
      capture(state, action.to, 'shoot');
      // 大将を撃ったら、その場で勝ち
      if (state.winner) {
        state.skillPhase = null;
        state.moveCount++;
        return state;
      }
      endTurn(state);
      return state;
    }
    case 'turncoat': {
      // 内応の密書: 選んだ駒が、その場で寝返る (出世はそのまま)。これで手番は終わり
      if (phase?.type !== 'naiou') fail('not naiou');
      if (!turncoatTargets(state).some((p) => samePos(p, action.at))) fail('illegal turncoat');
      commit();
      const piece = state.board[action.at.y][action.at.x] as Piece;
      piece.owner = side;
      state.events.push({ type: 'turncoat', side, piece: { ...piece }, at: action.at });
      endTurn(state);
      return state;
    }
    case 'flank': {
      // 挟み撃ち: 持ち駒を 敵の大将の真後ろに置く
      if (phase?.type !== 'flank') fail('not flank');
      if (!flankTargets(state, action.pieceId).some((p) => samePos(p, action.to))) fail('illegal flank');
      commit();
      const hand = state.hands[side];
      const [piece] = hand.splice(hand.findIndex((p) => p.id === action.pieceId), 1);
      state.board[action.to.y][action.to.x] = piece;
      state.events.push({ type: 'drop', side, pieceId: piece.id, to: action.to });
      afterFlankStep(state, `placed:${piece.id}`);
      return state;
    }
    case 'bombard': {
      // 大筒の砲撃: 相手の陣の駒を1枚取る
      if (phase?.type !== 'cannon') fail('not cannon');
      if (!cannonTargets(state).some((p) => samePos(p, action.to))) fail('illegal bombard');
      commit();
      capture(state, action.to, 'shoot');
      endTurn(state);
      return state;
    }
    case 'pull': {
      if (phase?.type !== 'pull' || phase.step !== 1) fail('not pulling');
      if (!pullTargets(state, action.from).some((p) => samePos(p, action.to))) fail('illegal pull');
      commit();
      const piece = state.board[action.from.y][action.from.x] as Piece;
      state.board[action.from.y][action.from.x] = null;
      state.board[action.to.y][action.to.x] = piece;
      state.events.push({ type: 'pull', side, piece: { ...piece }, from: action.from, to: action.to });
      // 引き寄せたら、続けて自分の駒を1回動かせる (動かさずに終えてもよい)
      state.skillPhase = { type: 'pull', step: 2, moved: [] };
      if (!hasAnySkillMove(state)) endTurn(state);
      return state;
    }
    case 'spawn': {
      if (phase?.type !== 'spawn') fail('not spawning');
      if (!spawnTargets(state).some((p) => samePos(p, action.to))) fail('illegal spawn');
      commit();
      const id = `${side}-spawn-${state.moveCount}`;
      state.board[action.to.y][action.to.x] = { id, kind: 'P', owner: side, promoted: false, name: '足軽', originFamily: fam };
      state.events.push({ type: 'spawn', side, pieceId: id, to: action.to });
      endTurn(state);
      return state;
    }
    case 'drop': {
      if (!legalDrops(state, action.pieceId).some((p) => samePos(p, action.to))) fail('illegal drop');
      commit();
      const hand = state.hands[side];
      const idx = hand.findIndex((p) => p.id === action.pieceId);
      const [piece] = hand.splice(idx, 1);
      state.board[action.to.y][action.to.x] = piece;
      state.events.push({ type: 'drop', side, pieceId: piece.id, to: action.to });
      if (phase?.type === 'drop2' && phase.step === 1) {
        state.skillPhase = { ...phase, step: 2 };
        if (hand.length === 0 || legalDrops(state, hand[0].id).length === 0) endTurn(state);
        return state;
      }
      if (phase?.type === 'flank') {
        afterFlankStep(state, 'acted');
        return state;
      }
      endTurn(state);
      return state;
    }
    case 'move': {
      const { from, to } = action;
      if (!legalMoves(state, from).some((p) => samePos(p, to))) fail('illegal move');
      commit();
      const piece = state.board[from.y][from.x] as Piece;
      if (state.board[to.y][to.x]) capture(state, to, 'move');
      state.board[from.y][from.x] = null;
      state.board[to.y][to.x] = piece;
      state.events.push({ type: 'move', side, pieceId: piece.id, from, to });
      const promotes =
        canPromote(state.variant, piece.kind) &&
        !piece.promoted &&
        (inEnemyZone(state, side, to) || (state.variant === 'large' && inEnemyZone(state, side, from)));
      if (promotes) {
        piece.promoted = true;
        state.events.push({ type: 'promote', side, piece: { ...piece }, at: to });
      }
      if (state.winner) {
        state.skillPhase = null;
        state.moveCount++;
        return state;
      }
      if (phase && (phase.type === 'double' || phase.type === 'kingDouble') && phase.step === 1) {
        state.skillPhase = { ...phase, step: 2 };
        if (!hasAnySkillMove(state)) endTurn(state);
        return state;
      }
      if (phase?.type === 'flank') {
        afterFlankStep(state, 'acted');
        return state;
      }
      if (phase?.type === 'arrows') {
        const moved = [...phase.moved, piece.id];
        state.skillPhase = { ...phase, step: moved.length + 1, moved };
        if (moved.length >= 3 || !hasAnySkillMove(state)) endTurn(state);
        return state;
      }
      endTurn(state);
      return state;
    }
  }
}

/**
 * 挟み撃ち: 置く・ふつうの1手 のどちらかが終わったところ。
 * 両方終わったら手番を終える。残りの一方が もうできなければ、そこで終える
 */
function afterFlankStep(state: GameState, done: string) {
  const phase = state.skillPhase as NonNullable<GameState['skillPhase']>;
  state.skillPhase = { ...phase, step: 2, moved: [...phase.moved, done] };
  const fs = flankState(state);
  if (fs.placed && fs.acted) return endTurn(state);
  if (!fs.placed && !state.hands[state.turn].some((p) => flankTargets(state, p.id).length > 0)) return endTurn(state);
  if (!fs.acted) {
    const canDrop = state.hands[state.turn].some((p) => legalDrops(state, p.id).length > 0);
    if (!canDrop && !hasAnySkillMove(state)) endTurn(state);
  }
}

/** 鳴くまで待とう: ひとつ前の手番 (相手の番) の始まりに戻す */
function undoLastTurn(state: GameState): GameState {
  const side = state.turn;
  const target = state.lastTurnStart as Snapshot;
  const next: GameState = {
    ...structuredClone(target),
    thisTurnStart: null,
    lastTurnStart: null,
    events: [],
  };
  next.skillUsed[side] = true;
  next.forbidden = state.lastTurnFirst;
  next.turnFirst = null;
  next.lastTurnFirst = null;
  next.events.push({ type: 'skill', side, family: state.families[side] }, { type: 'undo', side });
  next.thisTurnStart = snapshot(next);
  return next;
}

function capture(state: GameState, at: Pos, by: 'move' | 'shoot') {
  const side = state.turn;
  const target = state.board[at.y][at.x] as Piece;
  state.board[at.y][at.x] = null;
  state.events.push({ type: 'capture', side, piece: { ...target }, at, by });
  if (target.kind === 'K') {
    state.winner = side;
    state.winReason = 'capture';
    state.events.push({ type: 'win', side, reason: 'capture' });
    return;
  }
  // 寝返り: 持ち駒になる。成りは元に戻る。武将名はそのまま
  state.hands[side].push({ ...target, owner: side, promoted: false });
}

function endTurn(state: GameState) {
  state.skillPhase = null;
  state.moveCount++;
  state.forbidden = null;
  state.lastTurnFirst = state.turnFirst;
  state.turnFirst = null;
  state.turn = opponent(state.turn);
  // 小田原城は、相手の番が終わって自分の番に戻ったら切れる
  if (state.shield === state.turn) state.shield = null;
  // トライ: 相手の一番奥に入った大将が、相手の番のあいだ取られずに残っていたら勝ち
  if (isTrying(state, state.turn)) {
    state.winner = state.turn;
    state.winReason = 'try';
    state.events.push({ type: 'win', side: state.turn, reason: 'try' });
    return;
  }
  const key = positionKey(state);
  state.positions.push(key);
  if (state.positions.filter((k) => k === key).length >= 3) {
    state.draw = true;
    state.events.push({ type: 'draw' } satisfies GameEvent);
    return;
  }
  if (state.search) {
    state.lastTurnStart = null;
    state.thisTurnStart = null;
    return;
  }
  state.lastTurnStart = state.thisTurnStart;
  state.thisTurnStart = snapshot(state);
}
