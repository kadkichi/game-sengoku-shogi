import { describe, expect, it } from 'vitest';
import { applyAction, canActivateSkill, cannonTargets, createGame, isKingInDanger, legalMoves, pieceAt, turncoatTargets } from './game';
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
  const kobayakawa = (owner: Side = 'gote') => piece(owner, 'S', '小早川秀秋', 'west');
  const kikkawa = (owner: Side = 'gote') => piece(owner, 'S', '吉川広家', 'west');

  it('はじめから使えて、小早川か吉川の どちらかを えらんで 寝返らせる。手番は終わる', () => {
    let s = createGame({ sente: 'east', gote: 'west' }, 'large');
    expect(canActivateSkill(s)).toBe(true);
    s = applyAction(s, { type: 'activateSkill' });
    expect(turncoatTargets(s).map((p) => pieceAt(s, p)?.name).sort()).toEqual(['吉川広家', '小早川秀秋']);
    s = applyAction(s, { type: 'turncoat', at: P(4, 0) });
    expect(pieceAt(s, P(4, 0))).toMatchObject({ name: '小早川秀秋', owner: 'sente' });
    expect(pieceAt(s, P(0, 0))?.owner).toBe('gote');
    expect(s.events.some((e) => e.type === 'turncoat')).toBe(true);
    expect(s.turn).toBe('gote');
    expect(s.skillUsed.sente).toBe(true);
  });

  it('えらぶ前なら やめられる', () => {
    let s = applyAction(createGame({ sente: 'east', gote: 'west' }, 'large'), { type: 'activateSkill' });
    s = applyAction(s, { type: 'cancelSkill' });
    expect(s.skillPhase).toBeNull();
    expect(s.skillUsed.sente).toBe(false);
  });

  it('出世している駒は、出世したまま寝返る', () => {
    const k = kikkawa();
    k.promoted = true;
    let s = custom([...kings(), [P(4, 2), k]]);
    s = applyAction(applyAction(s, { type: 'activateSkill' }), { type: 'turncoat', at: P(4, 2) });
    expect(pieceAt(s, P(4, 2))).toMatchObject({ owner: 'sente', promoted: true });
  });

  it('盤の上の西軍に 2人とも いなければ 使えない (持ち駒や、もう東軍の駒は 対象外)', () => {
    const s = custom([...kings(), [P(4, 4), kikkawa('sente')]], { sente: [kobayakawa('sente')] });
    expect(canActivateSkill(s)).toBe(false);
  });

  it('CPU の手の一覧にも入る', () => {
    const s = custom([...kings(), [P(4, 0), kikkawa()]]);
    const t = listTurns(s).find((x) => x.actions[0].type === 'activateSkill');
    expect(t?.actions).toEqual([{ type: 'activateSkill' }, { type: 'turncoat', at: P(4, 0) }]);
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

/** 大坂の陣: 徳川方 (先手) 対 豊臣方 (後手) */
function osaka(season: 'winter' | 'summer', placements: [Pos, Piece][], turn: Side = 'sente'): GameState {
  const families = { sente: `${season}Tokugawa`, gote: `${season}Toyotomi` } as Record<Side, FamilyId>;
  const base = createGame(families, 'large');
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  const s: GameState = { ...base, board, turn, positions: [] };
  s.thisTurnStart = null;
  return s;
}
const osakaKings = (season: 'winter' | 'summer'): [Pos, Piece][] => [
  [P(2, 5), piece('sente', 'K', '徳川家康', `${season}Tokugawa` as FamilyId)],
  [P(2, 0), piece('gote', 'K', '豊臣秀頼', `${season}Toyotomi` as FamilyId)],
];

describe('大坂の陣: はじめの並び', () => {
  it('冬も夏も おなじ顔ぶれ', () => {
    for (const season of ['winter', 'summer']) {
      const s = createGame({ sente: `${season}Tokugawa`, gote: `${season}Toyotomi` } as Record<Side, FamilyId>, 'large');
      expect(s.board[5].map((p) => p?.name)).toEqual(['伊達政宗', '徳川秀忠', '徳川家康', '井伊直孝', '前田利常']);
      expect(s.board[0].map((p) => p?.name)).toEqual(['木村重成', '後藤又兵衛', '豊臣秀頼', '真田幸村', '毛利勝永']);
      expect(s.board[2].map((p) => p?.name ?? null)).toEqual([null, '大野治長', '明石全登', '長宗我部盛親', null]);
    }
  });
});

describe('冬の陣 豊臣方 真田丸', () => {
  const yuki = () => piece('gote', 'G', '真田幸村', 'winterToyotomi');
  it('幸村と まわり8マスの味方は、つぎの あいての番 とられない。手番は使わない', () => {
    let s = osaka(
      'winter',
      [
        ...osakaKings('winter'),
        [P(2, 2), yuki()],
        [P(3, 3), piece('gote', 'V', '明石全登', 'winterToyotomi')],
        [P(0, 3), piece('gote', 'V', '大野治長', 'winterToyotomi')],
        [P(3, 4), piece('sente', 'G', '井伊直孝', 'winterTokugawa')],
        [P(0, 4), piece('sente', 'G', '徳川秀忠', 'winterTokugawa')],
      ],
      'gote',
    );
    s = applyAction(s, { type: 'activateSkill' });
    expect(s.turn).toBe('gote');
    expect(s.shield).toBe('gote');
    // 守りは 幸村のまわりだけ
    s = applyAction(s, { type: 'move', from: P(2, 0), to: P(1, 0) });
    expect(legalMoves(s, P(3, 4)).some((p) => p.x === 3 && p.y === 3)).toBe(false);
    expect(legalMoves(s, P(0, 4)).some((p) => p.x === 0 && p.y === 3)).toBe(true);
  });

  it('幸村が いなければ 使えない', () => {
    expect(canActivateSkill(osaka('winter', osakaKings('winter'), 'gote'))).toBe(false);
  });

  it('守られている大将は あぶない扱いに ならない', () => {
    let s = osaka('winter', [...osakaKings('winter'), [P(2, 1), yuki()], [P(2, 2), piece('sente', 'G', '井伊直孝', 'winterTokugawa')]], 'gote');
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'move', from: P(2, 1), to: P(1, 1) });
    expect(isKingInDanger(s, 'gote')).toBe(false);
  });
});

describe('冬の陣 徳川方 大筒の砲撃', () => {
  it('相手の陣 (奥2段) の 大将いがいの駒を どこからでも とれる', () => {
    let s = osaka('winter', [
      ...osakaKings('winter'),
      [P(4, 1), piece('gote', 'G', '真田幸村', 'winterToyotomi')],
      [P(0, 3), piece('gote', 'V', '大野治長', 'winterToyotomi')],
    ]);
    s = applyAction(s, { type: 'activateSkill' });
    expect(cannonTargets(s)).toEqual([P(4, 1)]);
    s = applyAction(s, { type: 'bombard', to: P(4, 1) });
    expect(pieceAt(s, P(4, 1))).toBeNull();
    expect(s.hands.sente.map((p) => p.name)).toEqual(['真田幸村']);
    expect(s.turn).toBe('gote');
  });

  it('陣に 大将しか いなければ 使えない', () => {
    expect(canActivateSkill(osaka('winter', osakaKings('winter')))).toBe(false);
  });
});

describe('夏の陣 豊臣方 日本一の兵', () => {
  it('幸村が まっすぐ前と ななめ前に 何マスでも すすめる', () => {
    let s = osaka('summer', [...osakaKings('summer'), [P(1, 1), piece('gote', 'G', '真田幸村', 'summerToyotomi')]], 'gote');
    s = applyAction(s, { type: 'activateSkill' });
    const moves = legalMoves(s, P(1, 1)).map((p) => `${p.x},${p.y}`).sort();
    expect(moves).toEqual(['0,2', '1,2', '1,3', '1,4', '1,5', '2,2', '3,3', '4,4'].sort());
  });
});

describe('夏の陣 徳川方 大軍の進軍', () => {
  it('3まいまで 1マスずつ 前に すすめる', () => {
    let s = osaka('summer', [
      ...osakaKings('summer'),
      [P(0, 4), piece('sente', 'G', '徳川秀忠', 'summerTokugawa')],
      [P(1, 4), piece('sente', 'V', '藤堂高虎', 'summerTokugawa')],
    ]);
    s = applyAction(s, { type: 'activateSkill' });
    s = applyAction(s, { type: 'move', from: P(0, 4), to: P(0, 3) });
    // 動かせる駒が もう ないので、ここで 手番が おわる
    s = applyAction(s, { type: 'move', from: P(1, 4), to: P(1, 3) });
    expect(pieceAt(s, P(0, 3))?.name).toBe('徳川秀忠');
    expect(pieceAt(s, P(1, 3))?.name).toBe('藤堂高虎');
    expect(s.turn).toBe('gote');
  });
});
