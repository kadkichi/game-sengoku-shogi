import { describe, expect, it } from 'vitest';
import { applyAction, canActivateSkill, createGame, flankTargets, legalDrops, legalMoves, pieceAt, IllegalAction } from './game';
import { listTurns } from './turns';
import type { Cell, GameState, Kind, Piece, Pos, Side } from './types';

const P = (x: number, y: number): Pos => ({ x, y });
let seq = 0;
const piece = (owner: Side, kind: Kind, name: string = kind): Piece => ({
  id: `a${seq++}`,
  owner,
  kind,
  promoted: false,
  name,
  originFamily: owner === 'sente' ? 'asai' : 'oda',
});

/** 浅井 (先手) 対 織田 (後手) で、駒を自由に置いた局面 */
function custom(placements: [Pos, Piece][], hand: Piece[] = []): GameState {
  const base = createGame({ sente: 'asai', gote: 'oda' }, 'large');
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  const s: GameState = { ...base, board, positions: [], hands: { sente: hand, gote: [] } };
  s.thisTurnStart = null;
  return s;
}

describe('浅井家 挟み撃ち', () => {
  it('持ち駒がなければ使えない。敵の大将が一番奥にいて真後ろがなければ使えない', () => {
    expect(canActivateSkill(createGame({ sente: 'asai', gote: 'oda' }, 'large'))).toBe(false);
    const s = custom([[P(2, 5), piece('sente', 'K')], [P(2, 0), piece('gote', 'K')]], [piece('sente', 'G')]);
    expect(canActivateSkill(s)).toBe(false);
  });

  it('持ち駒を敵の大将の真後ろに置き、ふつうの1手もする。置いた駒はこの手番動けない', () => {
    const gold = piece('sente', 'G');
    let s = custom(
      [
        [P(2, 5), piece('sente', 'K')],
        [P(2, 2), piece('gote', 'K')],
        [P(0, 4), piece('sente', 'S')],
      ],
      [gold],
    );
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    expect(flankTargets(s, gold.id)).toEqual([P(2, 1)]);
    s = applyAction(s, { type: 'flank', pieceId: gold.id, to: P(2, 1) });
    expect(pieceAt(s, P(2, 1))?.id).toBe(gold.id);
    expect(s.turn).toBe('sente');
    expect(legalMoves(s, P(2, 1))).toEqual([]);
    s = applyAction(s, { type: 'move', from: P(0, 4), to: P(0, 3) });
    expect(s.turn).toBe('gote');
    expect(s.skillUsed.sente).toBe(true);
  });

  it('先に ふつうの1手 (打つ) をしてから置いてもいい', () => {
    const g1 = piece('sente', 'G');
    const s1 = piece('sente', 'S');
    let s = custom([[P(2, 5), piece('sente', 'K')], [P(2, 2), piece('gote', 'K')]], [g1, s1]);
    s = applyAction(s, { type: 'activateSkill' });
    expect(legalDrops(s, s1.id).length).toBeGreaterThan(0);
    s = applyAction(s, { type: 'drop', pieceId: s1.id, to: P(4, 4) });
    expect(s.turn).toBe('sente');
    expect(() => applyAction(s, { type: 'move', from: P(2, 5), to: P(2, 4) })).toThrow(IllegalAction);
    s = applyAction(s, { type: 'flank', pieceId: g1.id, to: P(2, 1) });
    expect(s.turn).toBe('gote');
  });

  it('置くだけで 手番を終えることは できない', () => {
    const gold = piece('sente', 'G');
    let s = custom([[P(2, 5), piece('sente', 'K')], [P(2, 2), piece('gote', 'K')]], [gold]);
    s = applyAction(applyAction(s, { type: 'activateSkill' }), { type: 'flank', pieceId: gold.id, to: P(2, 1) });
    expect(() => applyAction(s, { type: 'endSkill' })).toThrow(IllegalAction);
  });

  it('CPU の手の一覧にも入る', () => {
    const gold = piece('sente', 'G');
    const s = custom([[P(2, 5), piece('sente', 'K')], [P(2, 2), piece('gote', 'K')]], [gold]);
    const t = listTurns(s).find((x) => x.actions[0].type === 'activateSkill');
    expect(t).toBeDefined();
    expect(t!.result.turn).toBe('gote');
  });
});
