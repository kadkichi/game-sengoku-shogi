import { describe, expect, it } from 'vitest';
import { FAMILY_IDS, type FamilyId } from '../data/families';
import { applyAction, createGame } from '../engine/game';
import { listTurns } from '../engine/turns';
import type { Cell, GameState, Kind, Piece, Pos, Side, Variant } from '../engine/types';
import { chooseTurn, type CpuLevel } from './cpu';

const P = (x: number, y: number): Pos => ({ x, y });
let seq = 0;
const piece = (owner: Side, kind: Kind): Piece => ({ id: `c${seq++}`, owner, kind, promoted: false, name: kind, originFamily: 'oda' });

function custom(placements: [Pos, Piece][], families: Record<Side, FamilyId>, variant: Variant = 'large', turn: Side = 'sente'): GameState {
  const base = createGame(families, variant);
  const board: Cell[][] = base.board.map((row) => row.map(() => null));
  for (const [p, pc] of placements) board[p.y][p.x] = pc;
  return { ...base, board, turn, positions: [] };
}

/** 決まった並びの乱数 (テストを毎回同じ結果にする) */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 選んだ操作を実際に指して、反則にならないことを確かめる */
function play(state: GameState, level: CpuLevel, rng = seeded(1)) {
  const actions = chooseTurn(state, level, rng);
  let s = state;
  for (const a of actions) s = applyAction(s, a);
  return { actions, after: s };
}

describe('指せる手番の一覧', () => {
  it('初期局面の手がすべて反則なしで指せる', () => {
    const s = createGame({ sente: 'oda', gote: 'takeda' }, 'small');
    const turns = listTurns(s);
    expect(turns.length).toBeGreaterThan(0);
    for (const t of turns) {
      let x = s;
      for (const a of t.actions) x = applyAction(x, a);
      expect(x.turn === 'gote' || x.winner !== null).toBe(true);
    }
  });

  it('必殺技を使う手番も並ぶ (武田は2回動かす)', () => {
    const s = createGame({ sente: 'takeda', gote: 'oda' }, 'large');
    const skillTurns = listTurns(s).filter((t) => t.actions[0].type === 'activateSkill');
    expect(skillTurns.length).toBeGreaterThan(0);
    expect(skillTurns.some((t) => t.actions.filter((a) => a.type === 'move').length === 2)).toBe(true);
  });
});

describe('CPU', () => {
  for (const level of ['weak', 'normal'] as CpuLevel[]) {
    it(`${level}: 大将を取れるときは必ず取る`, () => {
      const s = custom(
        [
          [P(2, 3), piece('sente', 'G')],
          [P(2, 2), piece('gote', 'K')],
          [P(0, 5), piece('sente', 'K')],
          [P(4, 0), piece('gote', 'G')],
        ],
        { sente: 'oda', gote: 'takeda' },
      );
      for (let i = 0; i < 10; i++) expect(play(s, level, seeded(i)).after.winner).toBe('sente');
    });
  }

  it('normal: 取られる場所に大将を置いたままにしない', () => {
    // 先手の大将が金に狙われている。normal は逃げるか金を取る
    const s = custom(
      [
        [P(2, 4), piece('sente', 'K')],
        [P(2, 2), piece('gote', 'G')],
        [P(2, 3), piece('gote', 'P')],
        [P(4, 0), piece('gote', 'K')],
      ],
      { sente: 'oda', gote: 'takeda' },
    );
    for (let i = 0; i < 5; i++) {
      const { after } = play(s, 'normal', seeded(i));
      const replies = listTurns(after);
      expect(replies.some((r) => r.result.winner === 'gote')).toBe(false);
    }
  });

  it('weak: うっかりも多い (タダで取れる駒を見のがすことがある)', () => {
    const s = custom(
      [
        [P(2, 3), piece('sente', 'G')],
        [P(2, 2), piece('gote', 'S')],
        [P(0, 5), piece('sente', 'K')],
        [P(4, 0), piece('gote', 'K')],
      ],
      { sente: 'oda', gote: 'takeda' },
    );
    let missed = 0;
    for (let i = 0; i < 40; i++) if (play(s, 'weak', seeded(i * 7 + 3)).after.hands.sente.length === 0) missed++;
    expect(missed).toBeGreaterThan(5);
  });

  it('normal: タダで取れる駒は取る', () => {
    const s = custom(
      [
        [P(2, 3), piece('sente', 'G')],
        [P(2, 2), piece('gote', 'S')],
        [P(0, 5), piece('sente', 'K')],
        [P(4, 0), piece('gote', 'K')],
      ],
      { sente: 'oda', gote: 'takeda' },
    );
    const { after } = play(s, 'normal');
    expect(after.hands.sente.length).toBe(1);
  });

  it('normal: 3×4 で相手のトライを止める (一番奥に入った大将を取る)', () => {
    const s = custom(
      [
        [P(0, 3), piece('gote', 'K')],
        [P(1, 3), piece('sente', 'K')],
        [P(2, 0), piece('sente', 'G')],
      ],
      { sente: 'oda', gote: 'takeda' },
      'small',
    );
    expect(play(s, 'normal').after.winner).toBe('sente');
  });

  it('必殺技でしか取れない駒を、必殺技を使って取る (織田の鉄砲)', () => {
    const s = custom(
      [
        [P(1, 3), piece('sente', 'P')],
        [P(1, 1), piece('gote', 'G')],
        [P(1, 0), piece('gote', 'P')],
        [P(4, 5), piece('sente', 'K')],
        [P(4, 0), piece('gote', 'K')],
      ],
      { sente: 'oda', gote: 'takeda' },
    );
    const { actions, after } = play(s, 'normal');
    expect(actions[0].type).toBe('activateSkill');
    expect(after.hands.sente.some((p) => p.kind === 'G')).toBe(true);
  });

  it('全12家・両モード・両方の強さで、初期局面から反則なく指せて、十分に速い', () => {
    let slowest = 0;
    for (const variant of ['small', 'large'] as Variant[]) {
      for (const fam of FAMILY_IDS) {
        for (const level of ['weak', 'normal'] as CpuLevel[]) {
          // 数手進めて、必殺技を使える局面も含める
          let s = createGame({ sente: fam, gote: FAMILY_IDS[(FAMILY_IDS.indexOf(fam) + 5) % 12] }, variant);
          for (let ply = 0; ply < 4 && !s.winner && !s.draw; ply++) {
            const t0 = performance.now();
            const r = play(s, level, seeded(ply + 7));
            slowest = Math.max(slowest, performance.now() - t0);
            s = r.after;
          }
        }
      }
    }
    // 画面を待たせすぎない目安
    expect(slowest).toBeLessThan(3000);
    console.log(`slowest CPU turn: ${Math.round(slowest)}ms`);
  }, 120_000);
});
