import { FAMILIES, YUKIMURA, type FamilyId, type SkillType } from '../data/families';
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
  },
  // 3×4: 金=たて・よこ、銀=ななめ
  small: {
    K: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
    G: [[0, -1], [-1, 0], [1, 0], [0, 1]],
    S: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    P: [[0, -1]],
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

/** 成れる駒。3×4 は足軽だけ */
const canPromote = (variant: Variant, kind: Kind) => kind === 'P' || (variant === 'large' && kind === 'S');

/** 動ける方向 (盤上の向き。先手は上が前) */
export const directions = (piece: Piece, variant: Variant): [number, number][] => {
  const f = forward(piece.owner);
  const vecs = piece.promoted ? PROMOTED : VECTORS[variant][piece.kind];
  return vecs.map(([dx, dy]) => [dx * -f, dy * -f]);
};

/** 真田家の必殺技を使える幸村か (寝返った幸村や、相手の真田家の幸村は使えない) */
export const isYukimura = (state: GameState, piece: Piece | null, side: Side): boolean =>
  !!piece &&
  piece.owner === side &&
  piece.name === YUKIMURA &&
  piece.originFamily === 'sanada' &&
  state.families[side] === 'sanada';

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
    for (const x of pawns) board[pawnRow][x] = make(side, 'P', '足軽');
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
const isShielded = (state: GameState, p: Pos) => {
  const target = pieceAt(state, p);
  return !!target && state.shield !== null && target.owner === state.shield && state.shield !== state.turn;
};

const isForbidden = (state: GameState, action: Action) => {
  const f = state.forbidden;
  if (!f || f.type !== action.type) return false;
  if ((f.type === 'move' || f.type === 'shoot' || f.type === 'pull') && 'from' in action && 'to' in action)
    return samePos(f.from, action.from) && samePos(f.to, action.to);
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
        moves = pseudoMoves(state, from);
        if (phase.step >= 2) moves = moves.filter((to) => !pieceAt(state, to));
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
      case 'yukimura':
        if (!isYukimura(state, piece, state.turn)) return [];
        moves = slide(state, from, [[0, forward(piece.owner)]]);
        break;
      default:
        return [];
    }
  }
  return moves.filter((to) => !isShielded(state, to) && !isForbidden(state, { type: 'move', from, to }));
}

/** 持ち駒を打てるマス */
export function legalDrops(state: GameState, pieceId: string): Pos[] {
  if (gameOver(state)) return [];
  if (state.skillPhase && state.skillPhase.type !== 'drop2') return [];
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

/** 鉄砲三段撃ち / 東海一の弓取: この足軽が撃てるマス (前に1〜2マス。途中に駒があればそこで止まる。大将は撃てない) */
export function shootTargets(state: GameState, from: Pos): Pos[] {
  const piece = pieceAt(state, from);
  if (!piece || piece.owner !== state.turn || piece.kind !== 'P') return [];
  const f = forward(piece.owner);
  for (let step = 1; step <= 2; step++) {
    const to = { x: from.x, y: from.y + f * step };
    if (!inBounds(state, to)) return [];
    const target = pieceAt(state, to);
    if (!target) continue;
    if (target.owner === piece.owner || target.kind === 'K' || isShielded(state, to)) return [];
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
    case 'yukimura':
      return hasAnySkillMove(trial);
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
  if (state.shield === side) return false;
  const king = findKing(state, side);
  if (!king) return false;
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
      if (type === 'shield') {
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
      if (!phase || phase.step < 2) fail('nothing to end');
      endTurn(state);
      return state;
    }
    case 'shoot': {
      if (phase?.type !== 'shoot') fail('not shooting');
      if (!shootTargets(state, action.from).some((p) => samePos(p, action.to))) fail('illegal shot');
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
