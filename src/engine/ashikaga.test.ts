import { describe, expect, it } from 'vitest';
import { applyAction, canActivateSkill, createGame, legalMoves, pieceAt, swordTargets, upliftTargets } from './game';
import { listTurns } from './turns';
import type { Cell, GameState, Kind, Piece, Pos, Side } from './types';
import type { FamilyId } from '../data/families';

const P = (x: number, y: number): Pos => ({ x, y });
let seq = 0;
const piece = (owner: Side, kind: Kind, origin: FamilyId): Piece => ({ id: `s${seq++}`, owner, kind, promoted: false, name: kind, originFamily: origin });

function custom(families: Record<Side, FamilyId>, placements: [Pos, Piece][], variant: 'small' | 'large' = 'large'): GameState {
  const base = createGame(families, variant);
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  const s: GameState = { ...base, board, positions: [] };
  s.thisTurnStart = null;
  return s;
}

describe('足利家 剣豪将軍', () => {
  const fam = { sente: 'ashikaga', gote: 'oda' } as Record<Side, FamilyId>;

  it('大将のとなりの敵を、大将は動かずに斬る。敵の大将は斬れない', () => {
    let s = custom(fam, [
      [P(2, 4), piece('sente', 'K', 'ashikaga')],
      [P(3, 3), piece('gote', 'G', 'oda')],
      [P(1, 3), piece('gote', 'K', 'oda')],
      [P(0, 0), piece('gote', 'S', 'oda')],
    ]);
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    expect(swordTargets(s)).toEqual([P(3, 3)]);
    s = applyAction(s, { type: 'strike', to: P(3, 3) });
    expect(pieceAt(s, P(3, 3))).toBeNull();
    expect(pieceAt(s, P(2, 4))?.kind).toBe('K');
    expect(s.hands.sente).toHaveLength(1);
    expect(s.turn).toBe('gote');
  });

  it('となりに敵がいなければ使えない', () => {
    expect(canActivateSkill(createGame(fam, 'large'))).toBe(false);
  });
});

describe('斎藤家 下剋上', () => {
  const fam = { sente: 'saito', gote: 'oda' } as Record<Side, FamilyId>;

  it('足軽をその場で出世させ、続けてその足軽だけを1回動かす', () => {
    let s = createGame(fam, 'large');
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    expect(upliftTargets(s)).toHaveLength(3);
    s = applyAction(s, { type: 'uplift', at: P(1, 3) });
    expect(pieceAt(s, P(1, 3))?.promoted).toBe(true);
    expect(s.turn).toBe('sente');
    expect(legalMoves(s, P(2, 3))).toEqual([]);
    // 出世した足軽は 金の動き (横にも動ける)
    expect(legalMoves(s, P(1, 3)).some((p) => p.x === 0 && p.y === 3)).toBe(true);
    s = applyAction(s, { type: 'move', from: P(1, 3), to: P(0, 3) });
    expect(s.turn).toBe('gote');
  });

  it('かんたん (3×4) でも使える', () => {
    let s = createGame(fam, 'small');
    s = applyAction(applyAction(s, { type: 'activateSkill' }), { type: 'uplift', at: P(1, 2) });
    expect(pieceAt(s, P(1, 2))?.promoted).toBe(true);
  });

  it('CPU の手の一覧にも入る', () => {
    const t = listTurns(createGame(fam, 'large')).filter((x) => x.actions[0].type === 'activateSkill');
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((x) => x.result.turn === 'gote')).toBe(true);
  });
});
