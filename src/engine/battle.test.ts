import { describe, expect, it } from 'vitest';
import { applyAction, canActivateSkill, createGame, legalMoves, pieceAt, turncoatTargets } from './game';
import { listTurns } from './turns';
import type { Cell, GameState, Kind, Piece, Pos, Side } from './types';
import type { FamilyId } from '../data/families';

const P = (x: number, y: number): Pos => ({ x, y });

let seq = 0;
function piece(owner: Side, kind: Kind, name: string, originFamily: FamilyId): Piece {
  return { id: `b${seq++}`, owner, kind, promoted: false, name, originFamily };
}

/** 東軍 (先手) 対 西軍 (後手) で、駒を自由に置いた局面 */
function custom(placements: [Pos, Piece][], hands: Partial<Record<Side, Piece[]>> = {}, turn: Side = 'sente'): GameState {
  const base = createGame({ sente: 'east', gote: 'west' }, 'large');
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  const s: GameState = { ...base, board, turn, positions: [], hands: { sente: hands.sente ?? [], gote: hands.gote ?? [] } };
  s.thisTurnStart = null;
  return s;
}

const kings = (): [Pos, Piece][] => [
  [P(2, 5), piece('sente', 'K', '徳川家康', 'east')],
  [P(2, 0), piece('gote', 'K', '石田三成', 'west')],
];

describe('関ヶ原: はじめの並び', () => {
  it('足軽はおらず、名前のある武将16人が並ぶ。小早川・吉川は西軍の奥の両端', () => {
    const s = createGame({ sente: 'east', gote: 'west' }, 'large');
    const names = (y: number) => s.board[y].map((p) => p?.name ?? null);
    expect(names(5)).toEqual(['福島正則', '本多忠勝', '徳川家康', '井伊直政', '黒田長政']);
    expect(names(3)).toEqual([null, '藤堂高虎', '細川忠興', '加藤嘉明', null]);
    expect(names(0)).toEqual(['吉川広家', '大谷吉継', '石田三成', '島津義弘', '小早川秀秋']);
    expect(names(2)).toEqual([null, '島左近', '小西行長', '宇喜多秀家', null]);
    expect(s.board.flat().filter((p) => p?.kind === 'P')).toHaveLength(0);
    expect(s.board.flat().filter((p) => p?.kind === 'V')).toHaveLength(6);
  });
});

describe('先鋒', () => {
  it('前・左・右に1マス動ける', () => {
    const s = custom([...kings(), [P(2, 3), piece('sente', 'V', '藤堂高虎', 'east')]]);
    expect(legalMoves(s, P(2, 3)).map((p) => `${p.x},${p.y}`).sort()).toEqual(['1,3', '2,2', '3,3']);
  });

  it('相手の陣に入ると出世して、金と同じ動きになる', () => {
    let s = custom([...kings(), [P(0, 2), piece('sente', 'V', '藤堂高虎', 'east')]]);
    s = applyAction(s, { type: 'move', from: P(0, 2), to: P(0, 1) });
    expect(pieceAt(s, P(0, 1))?.promoted).toBe(true);
  });
});

describe('東軍 内応の密書', () => {
  const kobayakawa = () => piece('sente', 'S', '小早川秀秋', 'west');
  const kikkawa = (owner: Side = 'gote') => piece(owner, 'S', '吉川広家', 'west');

  it('はじめは使えない', () => {
    expect(canActivateSkill(createGame({ sente: 'east', gote: 'west' }, 'large'))).toBe(false);
  });

  it('小早川を持ち駒にしていて、吉川が西軍として盤上にいれば、吉川が寝返る。手番は終わる', () => {
    let s = custom([...kings(), [P(4, 0), kikkawa()]], { sente: [kobayakawa()] });
    expect(turncoatTargets(s)).toEqual([P(4, 0)]);
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    expect(pieceAt(s, P(4, 0))?.owner).toBe('sente');
    expect(s.events.some((e) => e.type === 'turncoat')).toBe(true);
    expect(s.turn).toBe('gote');
    expect(s.skillUsed.sente).toBe(true);
  });

  it('出世している駒は、出世したまま寝返る', () => {
    const k = kikkawa();
    k.promoted = true;
    let s = custom([...kings(), [P(4, 2), k]], { sente: [kobayakawa()] });
    s = applyAction(s, { type: 'activateSkill' });
    expect(pieceAt(s, P(4, 2))).toMatchObject({ owner: 'sente', promoted: true });
  });

  it('持ち駒の1人を盤に打ったあとは使えない', () => {
    const s = custom([...kings(), [P(4, 0), kikkawa()], [P(0, 3), { ...kobayakawa() }]]);
    expect(canActivateSkill(s)).toBe(false);
  });

  it('盤上の吉川がすでに東軍なら使えない', () => {
    const s = custom([...kings(), [P(4, 4), kikkawa('sente')]], { sente: [kobayakawa()] });
    expect(canActivateSkill(s)).toBe(false);
  });

  it('CPU の手の一覧にも入る', () => {
    const s = custom([...kings(), [P(4, 0), kikkawa()]], { sente: [kobayakawa()] });
    const t = listTurns(s).find((x) => x.actions[0].type === 'activateSkill');
    expect(t?.actions).toEqual([{ type: 'activateSkill' }]);
    expect(pieceAt(t!.result, P(4, 0))?.owner).toBe('sente');
  });
});

describe('西軍 島津の退き口', () => {
  const shimazu = (owner: Side = 'gote', origin: FamilyId = 'west') => piece(owner, 'G', '島津義弘', origin);

  it('島津義弘が まっすぐ前に何マスでも進み、止まった先の敵を取れる', () => {
    let s = custom([...kings(), [P(4, 1), shimazu()], [P(4, 5), piece('sente', 'G', '本多忠勝', 'east')]], {}, 'gote');
    s = applyAction(s, { type: 'activateSkill' });
    expect(legalMoves(s, P(4, 1)).map((p) => p.y)).toEqual([2, 3, 4, 5]);
    s = applyAction(s, { type: 'move', from: P(4, 1), to: P(4, 5) });
    expect(s.hands.gote.map((p) => p.name)).toEqual(['本多忠勝']);
    expect(s.turn).toBe('sente');
  });

  it('ほかの駒は動かせない', () => {
    const s = applyAction(
      custom([...kings(), [P(4, 1), shimazu()], [P(1, 1), piece('gote', 'G', '大谷吉継', 'west')]], {}, 'gote'),
      { type: 'activateSkill' },
    );
    expect(legalMoves(s, P(1, 1))).toEqual([]);
  });

  it('島津が盤上にいなければ使えない。東軍が打ち直した島津でも使えない', () => {
    expect(canActivateSkill(custom(kings(), {}, 'gote'))).toBe(false);
    const s = custom([...kings(), [P(4, 4), shimazu('sente')]], {}, 'sente');
    expect(canActivateSkill(s)).toBe(false);
  });
});
