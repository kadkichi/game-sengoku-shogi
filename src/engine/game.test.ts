import { describe, expect, it } from 'vitest';
import {
  applyAction,
  canActivateSkill,
  createGame,
  isKingInDanger,
  legalDrops,
  legalMoves,
  pieceAt,
  shooters,
  shootTargets,
  IllegalAction,
} from './game';
import type { Cell, GameState, Kind, Piece, Pos, Side } from './types';
import type { FamilyId } from '../data/families';

const P = (x: number, y: number): Pos => ({ x, y });
const sortPos = (ps: Pos[]) => [...ps].sort((a, b) => a.y - b.y || a.x - b.x);

let seq = 0;
function piece(owner: Side, kind: Kind, promoted = false): Piece {
  return { id: `t${seq++}`, owner, kind, promoted, name: kind, originFamily: 'oda' };
}

/** 空の盤に駒を置いた局面を作る */
function custom(
  placements: [Pos, Piece][],
  opts: { turn?: Side; families?: Record<Side, FamilyId> } = {},
): GameState {
  const base = createGame(opts.families ?? { sente: 'oda', gote: 'takeda' });
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  const s: GameState = { ...base, board, turn: opts.turn ?? 'sente', positions: [] };
  return s;
}

describe('初期配置', () => {
  it('5×6 の並び (足軽は3段目と4段目で向かい合う)', () => {
    const s = createGame({ sente: 'oda', gote: 'uesugi' });
    const row = (y: number) => s.board[y].map((c) => (c ? `${c.owner[0]}${c.kind}` : '.')).join(' ');
    expect(row(0)).toBe('gS gG gK gG gS');
    expect(row(1)).toBe('. . . . .');
    expect(row(2)).toBe('. gP gP gP .');
    expect(row(3)).toBe('. sP sP sP .');
    expect(row(4)).toBe('. . . . .');
    expect(row(5)).toBe('sS sG sK sG sS');
  });

  it('武将名が家ごとに入る', () => {
    const s = createGame({ sente: 'oda', gote: 'takeda' });
    expect(s.board[5][2]?.name).toBe('織田信長');
    expect(s.board[0][2]?.name).toBe('武田信玄');
    expect(s.board[3][1]?.name).toBe('足軽');
  });
});

describe('駒の動き', () => {
  it('足軽は前に1マス', () => {
    const s = custom([[P(2, 3), piece('sente', 'P')]]);
    expect(legalMoves(s, P(2, 3))).toEqual([P(2, 2)]);
  });

  it('後手の足軽は下に1マス', () => {
    const s = custom([[P(2, 2), piece('gote', 'P')]], { turn: 'gote' });
    expect(legalMoves(s, P(2, 2))).toEqual([P(2, 3)]);
  });

  it('金の武将は6方向', () => {
    const s = custom([[P(2, 3), piece('sente', 'G')]]);
    expect(sortPos(legalMoves(s, P(2, 3)))).toEqual(sortPos([P(1, 2), P(2, 2), P(3, 2), P(1, 3), P(3, 3), P(2, 4)]));
  });

  it('銀の武将は5方向', () => {
    const s = custom([[P(2, 3), piece('sente', 'S')]]);
    expect(sortPos(legalMoves(s, P(2, 3)))).toEqual(sortPos([P(1, 2), P(2, 2), P(3, 2), P(1, 4), P(3, 4)]));
  });

  it('大将は8方向。味方の駒には動けない', () => {
    const s = custom([
      [P(2, 3), piece('sente', 'K')],
      [P(2, 2), piece('sente', 'P')],
    ]);
    expect(legalMoves(s, P(2, 3))).toHaveLength(7);
  });

  it('相手の手番の駒は動かせない', () => {
    const s = custom([[P(2, 2), piece('gote', 'P')]]);
    expect(legalMoves(s, P(2, 2))).toEqual([]);
  });
});

describe('寝返り (取った駒は持ち駒)', () => {
  it('取った駒は自分の持ち駒になり、武将名はそのまま', () => {
    const g = piece('gote', 'G');
    g.name = '山県昌景';
    const s0 = custom([
      [P(2, 3), piece('sente', 'S')],
      [P(2, 2), g],
      [P(0, 5), piece('sente', 'K')],
      [P(4, 0), piece('gote', 'K')],
    ]);
    const s1 = applyAction(s0, { type: 'move', from: P(2, 3), to: P(2, 2) });
    expect(s1.hands.sente).toHaveLength(1);
    expect(s1.hands.sente[0]).toMatchObject({ owner: 'sente', name: '山県昌景', kind: 'G' });
    expect(s1.events.some((e) => e.type === 'capture')).toBe(true);
    expect(s1.turn).toBe('gote');
  });

  it('成った駒を取ると元に戻る', () => {
    const s0 = custom(
      [
        [P(2, 4), piece('gote', 'P', true)],
        [P(2, 5), piece('sente', 'K')],
        [P(4, 0), piece('gote', 'K')],
      ],
    );
    const s1 = applyAction(s0, { type: 'move', from: P(2, 5), to: P(2, 4) });
    expect(s1.hands.sente[0]).toMatchObject({ kind: 'P', promoted: false });
  });
});

describe('成り', () => {
  it('足軽は敵陣 (奥2段) に入ると成って金の動きになる', () => {
    const s0 = custom([
      [P(1, 2), piece('sente', 'P')],
      [P(0, 5), piece('sente', 'K')],
      [P(4, 0), piece('gote', 'K')],
    ]);
    const s1 = applyAction(s0, { type: 'move', from: P(1, 2), to: P(1, 1) });
    expect(s1.board[1][1]?.promoted).toBe(true);
    expect(s1.events.some((e) => e.type === 'promote')).toBe(true);
  });

  it('金の武将と大将は成らない', () => {
    const s0 = custom([
      [P(1, 2), piece('sente', 'G')],
      [P(0, 5), piece('sente', 'K')],
      [P(4, 0), piece('gote', 'K')],
    ]);
    const s1 = applyAction(s0, { type: 'move', from: P(1, 2), to: P(1, 1) });
    expect(s1.board[1][1]?.promoted).toBe(false);
  });

  it('後手の銀は 1・2段目 (y=4,5) で成る', () => {
    const s0 = custom(
      [
        [P(1, 3), piece('gote', 'S')],
        [P(4, 5), piece('sente', 'K')],
        [P(0, 0), piece('gote', 'K')],
      ],
      { turn: 'gote' },
    );
    const s1 = applyAction(s0, { type: 'move', from: P(1, 3), to: P(1, 4) });
    expect(s1.board[4][1]?.promoted).toBe(true);
  });
});

describe('打ち駒', () => {
  it('空いているマスならどこでも打てる。足軽は一番奥の段だけ禁止', () => {
    const s = custom([
      [P(2, 5), piece('sente', 'K')],
      [P(2, 0), piece('gote', 'K')],
    ]);
    const pawn = piece('sente', 'P');
    s.hands.sente.push(pawn);
    const drops = legalDrops(s, pawn.id);
    expect(drops.some((p) => p.y === 0)).toBe(false);
    expect(drops).toHaveLength(30 - 2 - 4);
  });

  it('二歩も許す', () => {
    const s = custom([
      [P(2, 5), piece('sente', 'K')],
      [P(2, 0), piece('gote', 'K')],
      [P(1, 3), piece('sente', 'P')],
    ]);
    const pawn = piece('sente', 'P');
    s.hands.sente.push(pawn);
    expect(legalDrops(s, pawn.id).some((p) => p.x === 1 && p.y === 4)).toBe(true);
  });

  it('打つと持ち駒から減り手番が変わる', () => {
    const s0 = custom([
      [P(2, 5), piece('sente', 'K')],
      [P(2, 0), piece('gote', 'K')],
    ]);
    const g = piece('sente', 'G');
    s0.hands.sente.push(g);
    const s1 = applyAction(s0, { type: 'drop', pieceId: g.id, to: P(0, 3) });
    expect(s1.hands.sente).toHaveLength(0);
    expect(s1.board[3][0]?.id).toBe(g.id);
    expect(s1.turn).toBe('gote');
  });
});

describe('勝敗', () => {
  it('相手の大将を取ったら勝ち', () => {
    const s0 = custom([
      [P(2, 2), piece('sente', 'G')],
      [P(2, 1), piece('gote', 'K')],
      [P(0, 5), piece('sente', 'K')],
    ]);
    const s1 = applyAction(s0, { type: 'move', from: P(2, 2), to: P(2, 1) });
    expect(s1.winner).toBe('sente');
    expect(() => applyAction(s1, { type: 'move', from: P(0, 5), to: P(0, 4) })).toThrow(IllegalAction);
  });

  it('自分から取られる場所に動いてもよい (注意表示のみ)', () => {
    const s0 = custom([
      [P(2, 3), piece('sente', 'K')],
      [P(2, 1), piece('gote', 'G')],
      [P(4, 0), piece('gote', 'K')],
    ]);
    const s1 = applyAction(s0, { type: 'move', from: P(2, 3), to: P(2, 2) });
    expect(isKingInDanger(s1, 'sente')).toBe(true);
    expect(s1.winner).toBeNull();
  });

  it('同じ局面が3回で引き分け', () => {
    let s = createGame({ sente: 'oda', gote: 'takeda' });
    const shuffle = [
      { from: P(1, 5), to: P(1, 4) },
      { from: P(1, 0), to: P(1, 1) },
      { from: P(1, 4), to: P(1, 5) },
      { from: P(1, 1), to: P(1, 0) },
    ];
    for (const m of shuffle) s = applyAction(s, { type: 'move', ...m });
    expect(s.draw).toBe(false);
    for (const m of shuffle) s = applyAction(s, { type: 'move', ...m });
    expect(s.draw).toBe(true);
  });
});

describe('織田家 鉄砲三段撃ち', () => {
  const setup = () =>
    custom(
      [
        [P(1, 3), piece('sente', 'P')],
        [P(1, 1), piece('gote', 'S')],
        [P(3, 3), piece('sente', 'P')],
        [P(3, 2), piece('gote', 'K')],
        [P(2, 5), piece('sente', 'K')],
      ],
      { families: { sente: 'oda', gote: 'uesugi' } },
    );

  it('前2マスまでの敵を撃てる。大将も撃てる', () => {
    const s = setup();
    expect(shootTargets(s, P(1, 3))).toEqual([P(1, 1)]);
    expect(shootTargets(s, P(3, 3))).toEqual([P(3, 2)]);
    expect(shooters(s)).toEqual([P(1, 3), P(3, 3)]);
  });

  it('大将を撃てば、その場で勝ち', () => {
    let s = applyAction(setup(), { type: 'activateSkill' });
    s = applyAction(s, { type: 'shoot', from: P(3, 3), to: P(3, 2) });
    expect(s.winner).toBe('sente');
    expect(s.winReason).toBe('capture');
    expect(s.skillPhase).toBeNull();
  });

  it('途中に駒があるとその先は撃てない', () => {
    const s = setup();
    s.board[2][1] = piece('sente', 'G');
    expect(shootTargets(s, P(1, 3))).toEqual([]);
  });

  it('撃った駒は持ち駒になり、足軽は動かない。1局に1回だけ', () => {
    let s = setup();
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'shoot', from: P(1, 3), to: P(1, 1) });
    expect(pieceAt(s, P(1, 1))).toBeNull();
    expect(pieceAt(s, P(1, 3))?.kind).toBe('P');
    expect(s.hands.sente).toHaveLength(1);
    expect(s.turn).toBe('gote');
    expect(s.skillUsed.sente).toBe(true);
    s.turn = 'sente';
    expect(canActivateSkill(s)).toBe(false);
  });

  it('発動後に取り消せる (回数は減らない)', () => {
    let s = applyAction(setup(), { type: 'activateSkill' });
    expect(legalMoves(s, P(2, 5))).toEqual([]);
    s = applyAction(s, { type: 'cancelSkill' });
    expect(s.skillPhase).toBeNull();
    expect(s.skillUsed.sente).toBe(false);
  });
});

describe('武田家 風林火山', () => {
  const setup = () =>
    custom(
      [
        [P(1, 3), piece('sente', 'G')],
        [P(1, 1), piece('gote', 'P')],
        [P(2, 5), piece('sente', 'K')],
        [P(4, 0), piece('gote', 'K')],
      ],
      { families: { sente: 'takeda', gote: 'oda' } },
    );

  it('大将以外の駒を2回動かせる。2回目でも駒を取れる', () => {
    let s = applyAction(setup(), { type: 'activateSkill' });
    expect(legalMoves(s, P(2, 5))).toEqual([]);
    s = applyAction(s, { type: 'move', from: P(1, 3), to: P(1, 2) });
    expect(s.turn).toBe('sente');
    expect(s.skillPhase).toMatchObject({ type: 'double', step: 2 });
    expect(legalMoves(s, P(1, 2)).some((p) => p.x === 1 && p.y === 1)).toBe(true);
    s = applyAction(s, { type: 'move', from: P(1, 2), to: P(1, 1) });
    expect(s.hands.sente).toHaveLength(1);
    expect(s.turn).toBe('gote');
    expect(s.moveCount).toBe(1);
    expect(s.skillUsed.sente).toBe(true);
  });

  it('2回目では大将は取れない', () => {
    let s = custom(
      [
        [P(2, 3), piece('sente', 'G')],
        [P(2, 1), piece('gote', 'K')],
        [P(0, 5), piece('sente', 'K')],
      ],
      { families: { sente: 'takeda', gote: 'oda' } },
    );
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'move', from: P(2, 3), to: P(2, 2) });
    expect(legalMoves(s, P(2, 2)).some((p) => p.x === 2 && p.y === 1)).toBe(false);
  });

  it('1回目では駒を取れる', () => {
    let s = applyAction(setup(), { type: 'activateSkill' });
    s = applyAction(s, { type: 'move', from: P(1, 3), to: P(1, 2) });
    s = applyAction(s, { type: 'endSkill' });
    expect(s.turn).toBe('gote');
    s.turn = 'sente';
    s.skillUsed.sente = false;
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'move', from: P(1, 2), to: P(1, 1) });
    expect(s.hands.sente).toHaveLength(1);
  });
});

describe('上杉家 毘沙門天の加護', () => {
  it('大将を2回動かせて、2回目で大将を取れば勝ち', () => {
    let s = custom(
      [
        [P(2, 3), piece('sente', 'K')],
        [P(2, 1), piece('gote', 'K')],
        [P(0, 3), piece('sente', 'G')],
      ],
      { families: { sente: 'uesugi', gote: 'oda' } },
    );
    s = applyAction(s, { type: 'activateSkill' });
    expect(legalMoves(s, P(0, 3))).toEqual([]);
    s = applyAction(s, { type: 'move', from: P(2, 3), to: P(2, 2) });
    expect(s.turn).toBe('sente');
    s = applyAction(s, { type: 'move', from: P(2, 2), to: P(2, 1) });
    expect(s.winner).toBe('sente');
  });
});
