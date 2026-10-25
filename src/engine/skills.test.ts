import { describe, expect, it } from 'vitest';
import {
  applyAction,
  canActivateSkill,
  createGame,
  isKingInDanger,
  legalDrops,
  legalMoves,
  pieceAt,
  pullSources,
  pullTargets,
  shootTargets,
  spawnTargets,
  IllegalAction,
} from './game';
import type { Cell, GameState, Kind, Piece, Pos, Side, Variant } from './types';
import type { FamilyId } from '../data/families';

const P = (x: number, y: number): Pos => ({ x, y });

let seq = 0;
function piece(owner: Side, kind: Kind, name: string = kind, originFamily: FamilyId = 'oda'): Piece {
  return { id: `k${seq++}`, owner, kind, promoted: false, name, originFamily };
}

function custom(
  placements: [Pos, Piece][],
  families: Record<Side, FamilyId>,
  opts: { turn?: Side; variant?: Variant } = {},
): GameState {
  const base = createGame(families, opts.variant ?? 'large');
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  const s: GameState = { ...base, board, turn: opts.turn ?? 'sente', positions: [] };
  s.thisTurnStart = null;
  return s;
}

const kings = (): [Pos, Piece][] => [
  [P(0, 5), piece('sente', 'K')],
  [P(4, 0), piece('gote', 'K')],
];

describe('豊臣家 一夜城', () => {
  const setup = () => {
    const s = custom(kings(), { sente: 'toyotomi', gote: 'oda' });
    s.hands.sente.push(piece('sente', 'G'), piece('sente', 'P'));
    return s;
  };

  it('もちごまを2まい つづけて打てる', () => {
    let s = applyAction(setup(), { type: 'activateSkill' });
    s = applyAction(s, { type: 'drop', pieceId: s.hands.sente[0].id, to: P(2, 2) });
    expect(s.turn).toBe('sente');
    s = applyAction(s, { type: 'drop', pieceId: s.hands.sente[0].id, to: P(2, 3) });
    expect(s.turn).toBe('gote');
    expect(s.hands.sente).toHaveLength(0);
    expect(s.moveCount).toBe(1);
  });

  it('もちごまが1まいでは使えない', () => {
    const s = setup();
    s.hands.sente.pop();
    expect(canActivateSkill(s)).toBe(false);
  });

  it('技の途中は盤上の駒を動かせない。1まいで終えてもよい', () => {
    let s = applyAction(setup(), { type: 'activateSkill' });
    expect(legalMoves(s, P(0, 5))).toEqual([]);
    s = applyAction(s, { type: 'drop', pieceId: s.hands.sente[0].id, to: P(2, 2) });
    s = applyAction(s, { type: 'endSkill' });
    expect(s.turn).toBe('gote');
    expect(s.hands.sente).toHaveLength(1);
  });
});

describe('徳川家 鳴くまで待とう', () => {
  it('相手の直前の手を取り消し、同じ手は指せなくなる', () => {
    // 先手が徳川なら、1手目はまだ戻す手がないので使えない
    expect(canActivateSkill(createGame({ sente: 'tokugawa', gote: 'oda' }))).toBe(false);
    let s = createGame({ sente: 'oda', gote: 'tokugawa' });
    s = applyAction(s, { type: 'move', from: P(2, 3), to: P(2, 2) }); // 先手が足軽を取る
    expect(s.hands.sente).toHaveLength(1);
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    expect(s.turn).toBe('sente');
    expect(s.hands.sente).toHaveLength(0);
    expect(pieceAt(s, P(2, 2))?.owner).toBe('gote');
    expect(s.skillUsed.gote).toBe(true);
    expect(s.events.some((e) => e.type === 'undo')).toBe(true);
    expect(legalMoves(s, P(2, 3))).toEqual([]);
    expect(() => applyAction(s, { type: 'move', from: P(2, 3), to: P(2, 2) })).toThrow(IllegalAction);
    s = applyAction(s, { type: 'move', from: P(1, 3), to: P(1, 2) });
    expect(s.turn).toBe('gote');
    expect(s.forbidden).toBeNull();
  });
});

describe('毛利家 三本の矢', () => {
  it('大将いがいを3まいまで1マスずつ前へ。とれない', () => {
    let s = custom(
      [...kings(), [P(1, 4), piece('sente', 'G')], [P(2, 4), piece('sente', 'S')], [P(3, 4), piece('sente', 'P')], [P(1, 3), piece('gote', 'P')]],
      { sente: 'mori', gote: 'oda' },
    );
    s = applyAction(s, { type: 'activateSkill' });
    expect(legalMoves(s, P(0, 5))).toEqual([]);
    expect(legalMoves(s, P(1, 4))).toEqual([]);
    expect(legalMoves(s, P(2, 4))).toEqual([P(2, 3)]);
    s = applyAction(s, { type: 'move', from: P(2, 4), to: P(2, 3) });
    expect(legalMoves(s, P(2, 3))).toEqual([]);
    s = applyAction(s, { type: 'move', from: P(3, 4), to: P(3, 3) });
    expect(s.turn).toBe('gote');
  });

  it('3まい動かしたら終わる', () => {
    let s = custom(
      [...kings(), [P(1, 4), piece('sente', 'G')], [P(2, 4), piece('sente', 'S')], [P(3, 4), piece('sente', 'P')]],
      { sente: 'mori', gote: 'oda' },
    );
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'move', from: P(1, 4), to: P(1, 3) });
    s = applyAction(s, { type: 'move', from: P(2, 4), to: P(2, 3) });
    expect(s.turn).toBe('sente');
    s = applyAction(s, { type: 'move', from: P(3, 4), to: P(3, 3) });
    expect(s.turn).toBe('gote');
    expect(s.moveCount).toBe(1);
  });
});

describe('北条家 小田原城', () => {
  it('手番を使わず、次の相手の番は駒を取られない', () => {
    let s = custom(
      [...kings(), [P(2, 3), piece('sente', 'G')], [P(2, 2), piece('gote', 'G')], [P(4, 5), piece('sente', 'P')]],
      { sente: 'hojo', gote: 'oda' },
    );
    s = applyAction(s, { type: 'activateSkill' });
    expect(s.turn).toBe('sente');
    expect(s.shield).toBe('sente');
    s = applyAction(s, { type: 'move', from: P(4, 5), to: P(4, 4) });
    expect(legalMoves(s, P(2, 2)).some((p) => p.x === 2 && p.y === 3)).toBe(false);
    s = applyAction(s, { type: 'move', from: P(4, 0), to: P(3, 0) });
    expect(s.shield).toBeNull();
    expect(s.turn).toBe('sente');
  });

  it('守られている間は大将も あぶなくない', () => {
    const s = custom(
      [[P(2, 4), piece('sente', 'K')], [P(2, 3), piece('gote', 'G')], [P(4, 0), piece('gote', 'K')]],
      { sente: 'hojo', gote: 'oda' },
      { turn: 'gote' },
    );
    expect(isKingInDanger(s, 'sente')).toBe(true);
    s.shield = 'sente';
    expect(isKingInDanger(s, 'sente')).toBe(false);
    expect(legalMoves(s, P(2, 3)).some((p) => p.x === 2 && p.y === 4)).toBe(false);
  });
});

describe('今川家 東海一の弓取', () => {
  it('織田と同じく足軽の前2マスの敵を撃てる', () => {
    let s = custom([...kings(), [P(1, 3), piece('sente', 'P')], [P(1, 1), piece('gote', 'S')]], { sente: 'imagawa', gote: 'oda' });
    s = applyAction(s, { type: 'activateSkill' });
    expect(shootTargets(s, P(1, 3))).toEqual([P(1, 1)]);
    s = applyAction(s, { type: 'shoot', from: P(1, 3), to: P(1, 1) });
    expect(s.hands.sente).toHaveLength(1);
  });
});

describe('伊達家 独眼竜', () => {
  it('大将いがいの駒が ななめに何マスでも。最初の敵で止まって取れる', () => {
    let s = custom(
      [...kings(), [P(0, 4), piece('sente', 'G')], [P(3, 1), piece('gote', 'S')]],
      { sente: 'date', gote: 'oda' },
    );
    s = applyAction(s, { type: 'activateSkill' });
    expect(legalMoves(s, P(0, 5))).toEqual([]);
    const moves = legalMoves(s, P(0, 4));
    expect(moves).toContainEqual(P(3, 1));
    expect(moves).not.toContainEqual(P(4, 0));
    s = applyAction(s, { type: 'move', from: P(0, 4), to: P(3, 1) });
    expect(s.hands.sente).toHaveLength(1);
    expect(s.turn).toBe('gote');
  });
});

describe('島津家 釣り野伏せ', () => {
  it('相手の駒を こちらへ1マス引き寄せる。大将は引き寄せられない', () => {
    let s = custom(
      [...kings(), [P(2, 1), piece('gote', 'G')], [P(1, 1), piece('gote', 'P')], [P(1, 2), piece('sente', 'P')]],
      { sente: 'shimazu', gote: 'oda' },
    );
    s = applyAction(s, { type: 'activateSkill' });
    expect(pullTargets(s, P(2, 1))).toEqual([P(2, 2)]);
    expect(pullTargets(s, P(1, 1))).toEqual([]);
    expect(pullTargets(s, P(4, 0))).toEqual([]);
    expect(pullSources(s)).toEqual([P(2, 1)]);
    s = applyAction(s, { type: 'pull', from: P(2, 1), to: P(2, 2) });
    expect(pieceAt(s, P(2, 2))?.owner).toBe('gote');
    // 引き寄せたあとも先手の番が続き、自分の駒を動かせる
    expect(s.turn).toBe('sente');
    expect(s.skillPhase).toMatchObject({ type: 'pull', step: 2 });
  });

  it('引き寄せたあと、自分の駒で その駒を取れる', () => {
    let s = custom(
      [...kings(), [P(2, 1), piece('gote', 'G')], [P(2, 3), piece('sente', 'G')]],
      { sente: 'shimazu', gote: 'oda' },
    );
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'pull', from: P(2, 1), to: P(2, 2) });
    s = applyAction(s, { type: 'move', from: P(2, 3), to: P(2, 2) });
    expect(s.hands.sente).toHaveLength(1);
    expect(s.turn).toBe('gote');
    expect(s.moveCount).toBe(1);
  });

  it('引き寄せたあと、動かさずに終えてもよい。引き寄せは2回できない', () => {
    let s = custom(
      [...kings(), [P(2, 1), piece('gote', 'G')], [P(1, 1), piece('gote', 'S')]],
      { sente: 'shimazu', gote: 'oda' },
    );
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'pull', from: P(2, 1), to: P(2, 2) });
    expect(() => applyAction(s, { type: 'pull', from: P(1, 1), to: P(1, 2) })).toThrow(IllegalAction);
    s = applyAction(s, { type: 'endSkill' });
    expect(s.turn).toBe('gote');
  });
});

describe('長宗我部家 一領具足', () => {
  it('もちごまがなくても新しい足軽を打てる。一番奥には打てない', () => {
    let s = custom(kings(), { sente: 'chosokabe', gote: 'oda' });
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    expect(spawnTargets(s).some((p) => p.y === 0)).toBe(false);
    s = applyAction(s, { type: 'spawn', to: P(2, 3) });
    expect(pieceAt(s, P(2, 3))).toMatchObject({ kind: 'P', owner: 'sente', originFamily: 'chosokabe' });
    expect(s.turn).toBe('gote');
    expect(legalDrops(s, 'none')).toEqual([]);
  });
});

describe('真田家 六文銭', () => {
  it('真田幸村がまっすぐ前に何マスでも進み、最初の敵を取れる', () => {
    let s = createGame({ sente: 'sanada', gote: 'oda' });
    expect(pieceAt(s, P(1, 5))?.name).toBe('真田幸村');
    s.board[3][1] = null; // 幸村の前の足軽をどける
    s = applyAction(s, { type: 'activateSkill' });
    expect(legalMoves(s, P(3, 5))).toEqual([]);
    const moves = legalMoves(s, P(1, 5));
    expect(moves).toEqual([P(1, 4), P(1, 3), P(1, 2)]);
    s = applyAction(s, { type: 'move', from: P(1, 5), to: P(1, 2) });
    expect(s.hands.sente).toHaveLength(1);
  });

  it('幸村が盤にいなければ使えない。寝返った幸村でも使えない', () => {
    const s = custom(
      [...kings(), [P(2, 3), piece('gote', 'G', '真田幸村', 'sanada')]],
      { sente: 'sanada', gote: 'sanada' },
    );
    expect(canActivateSkill(s)).toBe(false);
    s.board[3][2] = piece('sente', 'G', '真田幸村', 'oda');
    expect(canActivateSkill(s)).toBe(false);
  });

  it('3×4 でも幸村が盤に出る', () => {
    const s = createGame({ sente: 'sanada', gote: 'oda' }, 'small');
    expect(s.board[3][2]?.name).toBe('真田幸村');
  });
});
