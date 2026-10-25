import { describe, expect, it } from 'vitest';
import { applyAction, createGame, legalDrops, legalMoves, shootTargets } from './game';
import type { Cell, GameState, Kind, Piece, Pos, Side } from './types';
import type { FamilyId } from '../data/families';

const P = (x: number, y: number): Pos => ({ x, y });
const sortPos = (ps: Pos[]) => [...ps].sort((a, b) => a.y - b.y || a.x - b.x);

let seq = 0;
function piece(owner: Side, kind: Kind, promoted = false): Piece {
  return { id: `s${seq++}`, owner, kind, promoted, name: kind, originFamily: 'oda' };
}

function custom(placements: [Pos, Piece][], opts: { turn?: Side; families?: Record<Side, FamilyId> } = {}): GameState {
  const base = createGame(opts.families ?? { sente: 'oda', gote: 'takeda' }, 'small');
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  return { ...base, board, turn: opts.turn ?? 'sente', positions: [] };
}

describe('3×4 (かんたん) 初期配置', () => {
  it('手前に 銀・大将・金、その前に足軽', () => {
    const s = createGame({ sente: 'oda', gote: 'uesugi' }, 'small');
    const row = (y: number) => s.board[y].map((c) => (c ? `${c.owner[0]}${c.kind}` : '.')).join(' ');
    expect([s.cols, s.rows]).toEqual([3, 4]);
    expect(row(0)).toBe('gG gK gS');
    expect(row(1)).toBe('. gP .');
    expect(row(2)).toBe('. sP .');
    expect(row(3)).toBe('sS sK sG');
  });

  it('金・銀の武将には 5×6 の金の武将2人がつく', () => {
    const s = createGame({ sente: 'oda', gote: 'takeda' }, 'small');
    expect(s.board[3].map((c) => c?.name)).toEqual(['明智光秀', '織田信長', '柴田勝家']);
  });
});

describe('3×4 駒の動き', () => {
  it('金の武将はたて・よこ1マス', () => {
    const s = custom([[P(1, 2), piece('sente', 'G')]]);
    expect(sortPos(legalMoves(s, P(1, 2)))).toEqual(sortPos([P(1, 1), P(0, 2), P(2, 2), P(1, 3)]));
  });

  it('銀の武将はななめ1マス', () => {
    const s = custom([[P(1, 2), piece('sente', 'S')]]);
    expect(sortPos(legalMoves(s, P(1, 2)))).toEqual(sortPos([P(0, 1), P(2, 1), P(0, 3), P(2, 3)]));
  });

  it('足軽は一番奥で成って金 (6方向) の動きになる', () => {
    let s = custom([
      [P(0, 1), piece('sente', 'P')],
      [P(2, 3), piece('sente', 'K')],
      [P(2, 0), piece('gote', 'K')],
    ]);
    s = applyAction(s, { type: 'move', from: P(0, 1), to: P(0, 0) });
    expect(s.board[0][0]?.promoted).toBe(true);
  });

  it('銀の武将は成らない', () => {
    let s = custom([
      [P(1, 1), piece('sente', 'S')],
      [P(1, 3), piece('sente', 'K')],
      [P(2, 1), piece('gote', 'K')],
    ]);
    s = applyAction(s, { type: 'move', from: P(1, 1), to: P(0, 0) });
    expect(s.board[0][0]?.promoted).toBe(false);
  });

  it('足軽は一番奥の段に打てない', () => {
    const s = custom([
      [P(1, 3), piece('sente', 'K')],
      [P(1, 0), piece('gote', 'K')],
    ]);
    const pawn = piece('sente', 'P');
    s.hands.sente.push(pawn);
    expect(legalDrops(s, pawn.id).some((p) => p.y === 0)).toBe(false);
  });
});

describe('3×4 トライ', () => {
  it('大将が一番奥に入り、相手の番で取られなければ勝ち', () => {
    let s = custom([
      [P(0, 1), piece('sente', 'K')],
      [P(2, 2), piece('gote', 'K')],
    ]);
    s = applyAction(s, { type: 'move', from: P(0, 1), to: P(0, 0) });
    expect(s.winner).toBeNull();
    s = applyAction(s, { type: 'move', from: P(2, 2), to: P(2, 1) });
    expect(s.winner).toBe('sente');
    expect(s.winReason).toBe('try');
  });

  it('相手の番で取られたら負け', () => {
    let s = custom([
      [P(1, 1), piece('sente', 'K')],
      [P(1, 3), piece('sente', 'G')],
      [P(2, 1), piece('gote', 'K')],
      [P(0, 1), piece('gote', 'G')],
    ]);
    s = applyAction(s, { type: 'move', from: P(1, 1), to: P(0, 0) });
    s = applyAction(s, { type: 'move', from: P(0, 1), to: P(0, 0) });
    expect(s.winner).toBe('gote');
    expect(s.winReason).toBe('capture');
  });

  it('5×6 にはトライがない', () => {
    const base = createGame({ sente: 'oda', gote: 'takeda' }, 'large');
    const board: Cell[][] = base.board.map((row) => row.map(() => null));
    board[1][0] = piece('sente', 'K');
    board[5][4] = piece('gote', 'K');
    let s: GameState = { ...base, board, positions: [] };
    s = applyAction(s, { type: 'move', from: P(0, 1), to: P(0, 0) });
    s = applyAction(s, { type: 'move', from: P(4, 5), to: P(4, 4) });
    expect(s.winner).toBeNull();
  });
});

describe('3×4 必殺技', () => {
  it('毘沙門天の加護の途中は一番奥の段に入れない', () => {
    let s = custom(
      [
        [P(1, 2), piece('sente', 'K')],
        [P(2, 3), piece('gote', 'K')],
      ],
      { families: { sente: 'uesugi', gote: 'oda' } },
    );
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'move', from: P(1, 2), to: P(1, 1) });
    expect(legalMoves(s, P(1, 1)).some((p) => p.y === 0)).toBe(false);
    expect(legalMoves(s, P(1, 1)).length).toBeGreaterThan(0);
  });

  it('鉄砲は前2マスまで届く', () => {
    const s = custom(
      [
        [P(1, 2), piece('sente', 'P')],
        [P(1, 0), piece('gote', 'S')],
        [P(0, 3), piece('sente', 'K')],
        [P(2, 0), piece('gote', 'K')],
      ],
      { families: { sente: 'oda', gote: 'uesugi' } },
    );
    expect(shootTargets(s, P(1, 2))).toEqual([P(1, 0)]);
  });
});
