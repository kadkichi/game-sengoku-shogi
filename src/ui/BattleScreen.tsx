import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, type FamilyId } from '../data/families';
import {
  applyAction,
  canActivateSkill,
  cannonTargets,
  flankState,
  flankTargets,
  isProtected,
  turncoatTargets,
  createGame,
  directions,
  findKing,
  isKingInDanger,
  isTrying,
  legalDrops,
  legalMoves,
  opponent,
  pieceAt,
  pullSources,
  pullTargets,
  samePos,
  shooters,
  shootTargets,
  spawnTargets,
  IllegalAction,
} from '../engine/game';
import type { Action, GameState, Piece, Pos, Side, Variant, WinReason } from '../engine/types';
import { isMuted, play, setMuted, type SoundName } from '../audio/sound';
import { Chara, specialOf } from './Chara';
import { DirDots, PieceTile, type Motion } from './PieceTile';
import { Clash } from './Clash';
import { RulesDialog } from './RulesDialog';
import { OsakaCastle } from './OsakaCastle';
import { tileColors } from './sideColors';
import { useStage } from './Stage';
import { think } from '../ai/think';
import { LEVEL_LABEL, type CpuSetting } from '../ai/cpu';
import type { BattleDef } from '../data/battles';

export interface BattleResult {
  winner: Side | null;
  winReason: WinReason | null;
  families: Record<Side, FamilyId>;
  variant: Variant;
  moveCount: number;
}

/** マスの一辺 (px)。3×4 は大きく表示する */
const CELL: Record<Variant, number> = { small: 132, large: 96 };

/** 駒を選んで動かす型の必殺技 */
const MOVE_SKILLS = new Set(['double', 'kingDouble', 'arrows', 'slideDiag', 'charge', 'flank']);

interface Props {
  families: Record<Side, FamilyId>;
  variant: Variant;
  /** CPU と対戦するときの設定。null なら2人で遊ぶ */
  cpu: CpuSetting | null;
  /** 合戦モードなら、その合戦 (盤の柄が変わる) */
  battle?: BattleDef | null;
  onFinish: (result: BattleResult) => void;
  onQuit: () => void;
}

type Selection = { type: 'board'; pos: Pos } | { type: 'hand'; pieceId: string } | null;

interface Toast {
  key: number;
  label: string;
  text: string;
}

interface Ghost {
  key: number;
  piece: Piece;
  family: FamilyId;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

let seq = 0;
const TRY_COLORS = ['#ffe38a', '#ffffff', '#ff8a5c', '#7fd3ff', '#b6f08a'];

/** CPU の操作と操作のあいだの間 (ms) */
/** CPU が「かんがえ中…」を見せる最短の時間。あなたの手のアニメーションが終わってから数える */
const CPU_MIN_THINK = 900;
const CPU_STEP = 650;
const CPU_AFTER_SKILL = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function BattleScreen({ families, variant, cpu, battle, onFinish, onQuit }: Props) {
  const [game, setGame] = useState<GameState>(() => createGame(families, variant));
  /** CPU が続けて操作するとき、最新の局面を読むために使う */
  const gameRef = useRef(game);
  gameRef.current = game;
  const [sel, setSel] = useState<Selection>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [banner, setBanner] = useState<{ key: number; family: FamilyId } | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  /** 動いた駒の動き (駒の id ごと) */
  const [motions, setMotions] = useState<Record<string, Motion>>({});
  /** 取られる途中の駒 (ゆれてから消える) と、ぶつかったところの砂埃・刀 */
  const [defenders, setDefenders] = useState<{ key: number; piece: Piece; family: FamilyId; at: Pos }[]>([]);
  const [clashes, setClashes] = useState<{ key: number; x: number; y: number; kind: 'battle' | 'shot' }[]>([]);
  /** 戦闘のアニメーション中は、次の操作を受け付けない */
  const busyUntil = useRef(0);
  const [justPromoted, setJustPromoted] = useState<string | null>(null);
  /** トライの演出。exit=大将が盤の外の本陣へ進む / title=「トライ!」の文字 */
  const [tryRun, setTryRun] = useState<{ side: Side; at: Pos; piece: Piece; family: FamilyId; stage: 'exit' | 'title' } | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const { scale, ref: stageRef, compact } = useStage();
  const cellRefs = useRef(new Map<string, HTMLElement>());
  const handRefs = useRef<Partial<Record<Side, HTMLElement | null>>>({});

  /** スマホの横向きでは、画面の高さに盤が収まるようマスを小さくする */
  const cell = compact ? (variant === 'small' ? 96 : 64) : CELL[variant];
  const { cols, rows } = game;
  const over = game.winner !== null || game.draw;
  const turnFam = FAMILIES[game.families[game.turn]];
  const phase = game.skillPhase;
  const phaseType = phase?.type ?? null;

  // ---- 光らせるマス ----
  /** 必殺技で最初に選べる駒 (撃つ足軽・引き寄せる相手の駒・動かせる駒) */
  const sources = useMemo<Pos[]>(() => {
    if (!phaseType) return [];
    if (phaseType === 'shoot') return shooters(game);
    if (phaseType === 'pull' && phase?.step === 1) return pullSources(game);
    if (MOVE_SKILLS.has(phaseType) || phaseType === 'pull') {
      const out: Pos[] = [];
      game.board.forEach((row, y) =>
        row.forEach((p, x) => {
          if (p && p.owner === game.turn && legalMoves(game, { x, y }).length > 0) out.push({ x, y });
        }),
      );
      return out;
    }
    return [];
  }, [game, phaseType]);

  const targets = useMemo<Pos[]>(() => {
    if (phaseType === 'spawn') return spawnTargets(game);
    if (phaseType === 'naiou') return turncoatTargets(game);
    if (phaseType === 'cannon') return cannonTargets(game);
    if (!sel) return [];
    // 挟み撃ち: まだ置いていなければ、持ち駒は 敵の大将の真後ろに置く。置いたあとは ふつうに打てる
    if (sel.type === 'hand') return phaseType === 'flank' && !flankState(game).placed ? flankTargets(game, sel.pieceId) : legalDrops(game, sel.pieceId);
    if (phaseType === 'shoot') return shootTargets(game, sel.pos);
    if (phaseType === 'pull' && phase?.step === 1) return pullTargets(game, sel.pos);
    return legalMoves(game, sel.pos);
  }, [game, sel, phaseType]);
  const isTarget = (p: Pos) => targets.some((t) => samePos(t, p));

  const danger = !over && isKingInDanger(game, game.turn);
  /** 相手の大将が自分の一番奥に入っている (取らないとトライで負け) */
  const enemyTrying = !over && isTrying(game, opponent(game.turn));
  useEffect(() => {
    if (danger || enemyTrying) play('danger');
  }, [danger, enemyTrying, game.moveCount]);

  // ---- 演出の後片付け ----
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 1600);
    return () => clearTimeout(id);
  }, [banner]);
  useEffect(() => {
    if (!confirmQuit) return;
    const id = setTimeout(() => setConfirmQuit(false), 3000);
    return () => clearTimeout(id);
  }, [confirmQuit]);

  /** 画面上の要素の位置を、1280x800 のステージ座標に変換する */
  const stagePoint = useCallback(
    (el: HTMLElement | null | undefined) => {
      const stage = stageRef.current;
      if (!el || !stage) return null;
      const r = el.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale };
    },
    [scale, stageRef],
  );

  const dispatch = (action: Action) => {
    const game = gameRef.current;
    let next: GameState;
    try {
      next = applyAction(game, action);
    } catch (e) {
      if (e instanceof IllegalAction) return;
      throw e;
    }
    const side = game.turn;
    const army = FAMILIES[game.families[side]].army;
    let sound: SoundName | null = null;
    const say = (label: string, text: string) => setToast({ key: ++seq, label, text });

    const later = (ms: number, fn: () => void) => setTimeout(fn, ms);
    const animate = (id: string, m: Omit<Motion, 'key'>) => {
      const key = ++seq;
      setMotions((cur) => ({ ...cur, [id]: { ...m, key } }));
      later(1300, () => setMotions((cur) => (cur[id]?.key === key ? (({ [id]: _drop, ...rest }) => rest)(cur) : cur)));
    };
    const showDefender = (piece: Piece, at: Pos) => {
      const key = ++seq;
      setDefenders((cur) => [...cur, { key, piece, family: game.families[piece.owner], at }]);
      later(900, () => setDefenders((cur) => cur.filter((d) => d.key !== key)));
    };
    const showClash = (x: number, y: number, kind: 'battle' | 'shot') => {
      const key = ++seq;
      setClashes((cur) => [...cur, { key, x, y, kind }]);
      later(1200, () => setClashes((cur) => cur.filter((c) => c.key !== key)));
    };
    const captures = next.events.filter((e) => e.type === 'capture');
    const captureAt = (p: Pos) => captures.find((c) => c.type === 'capture' && samePos(c.at, p));
    /** この操作のアニメーションが終わるまでの目安 (ms)。CPU が次の操作をするまで待つのに使う */
    let busy = 350;

    for (const ev of next.events) {
      switch (ev.type) {
        case 'move': {
          const cap = captureAt(ev.to);
          const battle = cap?.type === 'capture' && cap.by === 'move';
          const fx = (ev.from.x - ev.to.x) * cell;
          const fy = (ev.from.y - ev.to.y) * cell;
          animate(ev.pieceId, { kind: battle ? 'battle' : 'slide', fx, fy });
          if (battle && cap?.type === 'capture') {
            // 2つのマスの境目でぶつかる
            showClash((ev.to.x + 0.5) * cell + fx / 2, (ev.to.y + 0.5) * cell + fy / 2, 'battle');
            showDefender(cap.piece, ev.to);
            later(270, () => play('clash'));
            later(720, () => play('capture'));
            busy = 1200;
          } else {
            sound ??= 'move';
          }
          break;
        }
        case 'drop':
        case 'spawn':
          animate(ev.pieceId, { kind: 'drop', fx: 0, fy: 0 });
          sound ??= 'move';
          if (ev.type === 'spawn') say('一領具足!', '新しい 足軽が 出陣した');
          break;
        case 'pull':
          animate(ev.piece.id, { kind: 'slide', fx: (ev.from.x - ev.to.x) * cell, fy: (ev.from.y - ev.to.y) * cell });
          sound ??= 'move';
          say('釣り野伏せ!', `${ev.piece.name}を ひきよせた`);
          break;
        case 'capture': {
          if (ev.by === 'shoot') {
            sound = 'shoot';
            showClash((ev.at.x + 0.5) * cell, (ev.at.y + 0.5) * cell, 'shot');
            showDefender(ev.piece, ev.at);
            busy = Math.max(busy, 900);
          }
          if (ev.piece.kind === 'K') {
            say('勝負あり!', `大将 ${ev.piece.name}を とった!`);
            break;
          }
          say(ev.by === 'shoot' ? 'ズドン!' : '寝返り!', `${ev.piece.name}が ${army}に 寝返った`);
          // ぶつかり合いが終わってから、取った駒が もちごまへ飛ぶ
          const at = ev.at;
          const piece = ev.piece;
          later(ev.by === 'move' ? 680 : 450, () => {
            const from = stagePoint(cellRefs.current.get(`${at.x},${at.y}`));
            const to = stagePoint(handRefs.current[side]);
            if (from && to) {
              setGhost({
                key: ++seq,
                piece,
                family: game.families[piece.owner],
                from: { x: from.x + 6, y: from.y + 6 },
                to: { x: to.x + to.w / 2 - 42, y: to.y + to.h / 2 - 42 },
              });
            }
          });
          break;
        }
        case 'promote':
          setJustPromoted(ev.piece.id);
          if (ev.piece.kind === 'V') say('出世!', `先鋒 ${ev.piece.name}が 出世した`);
          else say(ev.piece.kind === 'P' ? '出世!' : '武勲!', ev.piece.kind === 'P' ? '足軽が 武将なみに つよくなった' : `${ev.piece.name}が 武勲を あげた`);
          if (sound !== 'shoot') sound = 'promote';
          break;
        case 'shield': {
          const skill = FAMILIES[game.families[side]].skill;
          say(
            `${skill.name}!`,
            skill.type === 'fort' ? `${skill.unit}と まわりの駒は、つぎの あいての番 とられない` : `つぎの あいての番、${army}の駒は とられない`,
          );
          break;
        }
        case 'turncoat':
          // 内応の密書: 盤上の駒が、その場で寝返る
          setJustPromoted(ev.piece.id);
          say('内応じゃ!', `${ev.piece.name}が ${army}に 寝返った`);
          sound = 'promote';
          busy = Math.max(busy, 900);
          break;
        case 'undo':
          say('まった!', `${FAMILIES[game.families[opponent(side)]].army}の さっきの手を なかったことにした`);
          break;
      }
    }
    if (action.type === 'flank') say('挟み撃ち!', '敵の大将の うしろに 回りこんだ');
    if (sound) play(sound);
    // 大将が相手の一番奥の段に入った (次の相手の番で取られなければトライ)
    if (!next.winner && captures.length === 0 && isTrying(next, side) && !isTrying(game, side)) {
      say('トライまで あと すこし!', `${FAMILIES[game.families[side]].lord}が 本陣の 前に 入った`);
    }
    const tryWin = next.events.find((e) => e.type === 'win' && e.reason === 'try');
    const tryAt = tryWin?.type === 'win' ? findKing(next, tryWin.side) : null;
    if (tryWin?.type === 'win' && tryAt) {
      // トライ: 相手の手のアニメーションのあと、大将が盤の外の本陣へ進み、「トライ!」を見せてから結果へ
      const trySide = tryWin.side;
      const start = busy + 200;
      const piece = next.board[tryAt.y][tryAt.x] as Piece;
      later(start, () => {
        setTryRun({ side: trySide, at: tryAt, piece, family: next.families[trySide], stage: 'exit' });
        play('horagai');
      });
      later(start + 1400, () => {
        setTryRun((cur) => cur && { ...cur, stage: 'title' });
        play('win');
      });
      later(start + 3400, () => onFinish({ winner: next.winner, winReason: next.winReason, families, variant, moveCount: next.moveCount }));
      busy = start + 3400;
    } else if (next.winner || next.draw) {
      setTimeout(() => play(next.winner ? 'win' : 'draw'), 400);
      setTimeout(() => onFinish({ winner: next.winner, winReason: next.winReason, families, variant, moveCount: next.moveCount }), 1800);
    }
    busyUntil.current = performance.now() + busy;
    gameRef.current = next;
    setGame(next);
    setSel(null);
    return busy;
  };

  // ---- CPU ----
  /** いま CPU が指す番か */
  const isCpuTurn = !!cpu && !over && game.turn === cpu.side;
  const isCpuSide = (side: Side) => !!cpu && cpu.side === side;
  const [cpuThinking, setCpuThinking] = useState(false);
  useEffect(() => {
    if (!isCpuTurn || !cpu) return;
    let cancelled = false;
    setSel(null);
    (async () => {
      // あなたの手のアニメーション (すべる・戦う) が終わるのを待ってから考えはじめる
      await sleep(Math.max(0, busyUntil.current - performance.now()));
      if (cancelled) return;
      setCpuThinking(true);
      const started = performance.now();
      const actions = await think(gameRef.current, cpu.level);
      await sleep(Math.max(0, CPU_MIN_THINK - (performance.now() - started)));
      if (cancelled) return;
      setCpuThinking(false);
      for (const action of actions) {
        if (cancelled) return;
        if (action.type === 'activateSkill') {
          setBanner({ key: ++seq, family: gameRef.current.families[gameRef.current.turn] });
          play('skill');
          dispatch(action);
          await sleep(CPU_AFTER_SKILL);
        } else {
          // 戦闘のアニメーションが終わるまで待ってから、次の操作をする
          const busy = dispatch(action) ?? 0;
          await sleep(Math.max(CPU_STEP, busy + 150));
        }
      }
    })();
    return () => {
      cancelled = true;
      setCpuThinking(false);
    };
    // CPU の番が始まったときに1回だけ考える (途中の局面の変化では考え直さない)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuTurn, game.moveCount]);

  const clearGhost = useCallback(() => setGhost(null), []);

  // ---- 操作 ----
  /** 動かせない駒を押したときに、なぜ動かせないかを短く知らせる */
  const notice = (text: string) => {
    play('tap');
    setToast({ key: ++seq, label: 'うごけない', text });
  };
  const whyCannotMove = (piece: Piece): string => {
    if (piece.owner !== game.turn) return 'あいての駒は うごかせないよ';
    const name = piece.name;
    switch (phaseType) {
      case 'shoot':
        return '撃てるのは 光っている足軽だけだよ';
      case 'pull':
        return phase?.step === 1 ? 'ひきよせるのは 光っている あいての駒だよ' : `${name}は いま うごけないよ`;
      case 'drop2':
        return 'いまは もちごまを 打つ番だよ';
      case 'double':
        return piece.kind === 'K' ? '風林火山では 大将は うごかせないよ' : `${name}は いま うごけないよ`;
      case 'kingDouble':
        return piece.kind !== 'K' ? '毘沙門天の加護で うごかせるのは 大将だけだよ' : `${name}は いま うごけないよ`;
      case 'arrows':
        if (piece.kind === 'K') return '三本の矢では 大将は すすめられないよ';
        if (phase?.moved.includes(piece.id)) return `${name}は もう すすめたよ`;
        return `${name}の 前が ふさがっているよ`;
      case 'slideDiag':
        return piece.kind === 'K' ? '独眼竜では 大将は うごかせないよ' : `${name}は いま うごけないよ`;
      case 'charge':
        return `${turnFam.skill.name}で うごかせるのは ${turnFam.skill.unit}だけだよ`;
      case 'naiou':
        return '寝返らせられるのは 光っている 武将だけだよ';
      case 'cannon':
        return '大筒で ねらえるのは 光っている 駒だけだよ';
      case 'flank':
        if (piece.id === flankState(game).placed) return 'うしろに 置いた駒は この手番 うごかせないよ';
        return flankState(game).acted ? 'ふつうの1手は もう したよ。もちごまを 敵の大将の うしろに 置こう' : `${name}は いま うごけないよ`;
      default:
        return game.forbidden ? `${name}は いま うごけないよ (さっきと おなじ手は 指せない)` : `${name}は いま うごけないよ`;
    }
  };

  const onCell = (pos: Pos) => {
    if (over || isCpuTurn || performance.now() < busyUntil.current) return;
    const tapped = pieceAt(game, pos);
    if (phaseType === 'spawn') {
      if (isTarget(pos)) dispatch({ type: 'spawn', to: pos });
      return;
    }
    if (phaseType === 'naiou' || phaseType === 'cannon') {
      if (isTarget(pos)) dispatch(phaseType === 'naiou' ? { type: 'turncoat', at: pos } : { type: 'bombard', to: pos });
      else if (tapped) notice(whyCannotMove(tapped));
      return;
    }
    if (phaseType === 'shoot' || (phaseType === 'pull' && phase?.step === 1)) {
      if (sel?.type === 'board' && isTarget(pos)) {
        dispatch({ type: phaseType, from: sel.pos, to: pos });
        return;
      }
      if (sources.some((p) => samePos(p, pos))) {
        play('select');
        return setSel({ type: 'board', pos });
      }
      setSel(null);
      // 鉄砲なら自分の駒、釣り野伏せなら相手の駒が対象なので、それ以外を押したら知らせる
      if (tapped && (phaseType === 'shoot' ? tapped.owner === game.turn : true)) notice(whyCannotMove(tapped));
      return;
    }
    if (sel && isTarget(pos)) {
      return sel.type === 'board'
        ? dispatch({ type: 'move', from: sel.pos, to: pos })
        : phaseType === 'flank' && !flank.placed
          ? dispatch({ type: 'flank', pieceId: sel.pieceId, to: pos })
          : dispatch({ type: 'drop', pieceId: sel.pieceId, to: pos });
    }
    if (tapped && tapped.owner === game.turn && legalMoves(game, pos).length > 0) {
      if (sel?.type === 'board' && samePos(sel.pos, pos)) return setSel(null);
      play('select');
      return setSel({ type: 'board', pos });
    }
    setSel(null);
    // 駒を選んでいないときに、動かせない駒を押したら理由を出す (選んでいるときは「選びなおし」なので出さない)
    if (tapped && !sel) notice(whyCannotMove(tapped));
  };

  const flank = flankState(game);
  const handEnabled = (side: Side) =>
    !over && !isCpuSide(side) && side === game.turn && (!phase || phaseType === 'drop2' || (phaseType === 'flank' && !(flank.placed && flank.acted)));
  const onHand = (side: Side, pieceId: string) => {
    if (!handEnabled(side)) return;
    if (sel?.type === 'hand' && sel.pieceId === pieceId) return setSel(null);
    play('select');
    setSel({ type: 'hand', pieceId });
  };

  const onSkill = () => {
    if (isCpuTurn || !canActivateSkill(game)) return;
    setBanner({ key: ++seq, family: game.families[game.turn] });
    play('skill');
    dispatch({ type: 'activateSkill' });
  };

  // ---- 盤の下の案内 ----
  const selectedPiece: Piece | null =
    sel?.type === 'board' ? pieceAt(game, sel.pos) : sel?.type === 'hand' ? game.hands[game.turn].find((p) => p.id === sel.pieceId) ?? null : null;
  let hint = '';
  const hintButtons: { label: string; onClick: () => void }[] = [];
  const cancel = { label: 'やめる', onClick: () => dispatch({ type: 'cancelSkill' }) };
  const finish = (label: string) => ({ label, onClick: () => dispatch({ type: 'endSkill' }) });
  if (isCpuTurn) {
    hint = `${turnFam.army} (CPU ${LEVEL_LABEL[cpu!.level]}) が ${cpuThinking ? 'かんがえ中…' : 'さしているよ'}`;
  } else if (over) {
    hint = game.draw ? 'おなじ局面が 3かい。ひきわけ!' : `${FAMILIES[game.families[game.winner as Side]].army}の かち!`;
  } else if (phase) {
    const step = phase.step;
    switch (phase.type) {
      case 'shoot':
        hint = sel ? '撃つ あいてを えらんでね' : '撃つ 足軽を えらんでね (光っている足軽)';
        break;
      case 'pull':
        if (step === 1) hint = sel ? 'ひきよせる マスを えらんでね' : 'ひきよせる あいての駒を えらんでね (光っている駒)';
        else {
          hint = 'ひきよせた! つづけて 自分の駒を 1かい うごかせるよ';
          hintButtons.push(finish('うごかさずに おわる'));
        }
        break;
      case 'spawn':
        hint = '新しい 足軽を 打つ マスを えらんでね';
        break;
      case 'drop2':
        hint = step === 1 ? '1まいめの もちごまを 打とう' : '2まいめの もちごまを 打とう';
        if (step >= 2) hintButtons.push(finish('1まいで おわる'));
        break;
      case 'double':
        hint = step === 1 ? '大将いがいの駒を うごかそう (1かいめ)' : 'もう1かい うごかせるよ (駒は とれない)';
        if (step >= 2) hintButtons.push(finish('1かいで おわる'));
        break;
      case 'kingDouble':
        hint = step === 1 ? '大将を うごかそう (1かいめ)' : '大将を もう1かい うごかせるよ';
        if (step >= 2) hintButtons.push(finish('1かいで おわる'));
        break;
      case 'arrows':
        hint = `前に すすめる駒を えらんでね (${phase.moved.length}/3)`;
        if (step >= 2) hintButtons.push(finish('ここで おわる'));
        break;
      case 'slideDiag':
        hint = sel ? 'ななめの 光るマスに うごかそう' : 'ななめに うごかす駒を えらんでね';
        break;
      case 'charge':
        hint = `${turnFam.skill.unit}を ${turnFam.skill.chargeDirs === 'fan' ? '前か ななめ前に' : 'まっすぐ前に'} すすめよう`;
        break;
      case 'naiou':
        hint = '寝返らせる 武将を えらんでね (光っている駒)';
        break;
      case 'cannon':
        hint = '大筒で ねらう 駒を えらんでね (光っている駒)';
        break;
      case 'flank': {
        const fs = flankState(game);
        if (sel?.type === 'hand' && !fs.placed) hint = '敵の大将の 真後ろ (光るマス) に 置こう';
        else if (!fs.placed && !fs.acted) hint = 'もちごまを 敵の大将の 真後ろに 置いて、ふつうの1手も しよう';
        else if (!fs.placed) hint = 'もちごまを えらんで、敵の大将の 真後ろに 置こう';
        else hint = 'ふつうの1手を しよう (置いた駒は うごかせない)';
        break;
      }
    }
    if (step === 1) hintButtons.push(cancel);

  } else if (sel?.type === 'board' && selectedPiece) {
    hint = `${selectedPiece.name} を えらんだよ。光るマスに うごかそう`;
  } else if (sel?.type === 'hand' && selectedPiece) {
    hint = `${selectedPiece.name} を 打つマスを えらんでね`;
  } else if (enemyTrying) {
    hint = 'あいての大将を とらないと、トライで まけちゃう!';
  } else if (game.forbidden) {
    hint = 'さっきと おなじ手は もう 指せないよ';
  } else {
    hint = `${turnFam.army}の番。うごかす駒か もちごまを えらんでね`;
  }
  if (sel && !phase && !over) hintButtons.push({ label: 'えらびなおす', onClick: () => setSel(null) });

  // ---- 描画 ----
  /** 大将が入っていて、トライまであと少しの段 (黄色く光らせる) */
  const tryRows = (['sente', 'gote'] as Side[]).filter((s) => isTrying(game, s)).map((s) => (s === 'sente' ? 0 : rows - 1));
  /** 大坂の陣の盤の柄: 城の軍の陣 (奥2段) に大坂城の絵、相手の陣は陣地、あいだは野原 */
  const theme = battle?.board ?? null;
  const castleSide: Side | null = theme ? (families.sente === theme.castle ? 'sente' : 'gote') : null;
  const zoneOf = (y: number): Side | null => (y < 2 ? 'gote' : y >= rows - 2 ? 'sente' : null);
  const themeClass = (y: number) => {
    if (!theme) return '';
    const z = zoneOf(y);
    return z === null ? ' field' : z === castleSide ? ' castle' : ' jin';
  };
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const pos = { x, y };
      const piece = game.board[y][x];
      const target = isTarget(pos);
      const selected = sel?.type === 'board' && samePos(sel.pos, pos);
      const isSource = !selected && sources.some((p) => samePos(p, pos));
      const hidden = !!piece && tryRun?.piece.id === piece.id;
      const label = `${cols - x}の${rows - y}${piece ? ` ${FAMILIES[game.families[piece.owner]].army}の${piece.name}` : ''}${target ? ' (ここに うごける)' : ''}`;
      cells.push(
        <button
          key={`${x},${y}`}
          ref={(el) => {
            if (el) cellRefs.current.set(`${x},${y}`, el);
          }}
          className={`cell${x < cols - 1 ? ' line-r' : ''}${y < rows - 1 ? ' line-b' : ''}${variant === 'small' && (y === 0 || y === rows - 1) ? ' zone' : ''}${tryRows.includes(y) ? ' try-row' : ''}${themeClass(y)}`}
          aria-label={label}
          onClick={() => onCell(pos)}
        >
          {target && !piece && <span className="move-dot" style={{ left: cell / 2 - 18, top: cell / 2 - 18 }} />}
          {piece && !hidden && (
            <PieceTile
              piece={piece}
              family={game.families[piece.owner]}
              variant={variant}
              cell={cell}
              selected={selected}
              target={target}
              shooter={isSource}
              shielded={isProtected(game, pos)}
              motion={motions[piece.id]}
              justPromoted={justPromoted === piece.id}
            />
          )}
          {target && piece && (
            <span className={`tag${phaseType === 'shoot' || phaseType === 'cannon' ? ' tag-shoot' : ''}`}>
              {phaseType === 'shoot' || phaseType === 'cannon' ? 'うつ!' : phaseType === 'naiou' ? '寝返らせる' : 'とれる!'}
            </span>
          )}
        </button>,
      );
    }
  }

  const panel = (side: Side) => (
    <SidePanel
      side={side}
      compact={compact}
      cpuLabel={isCpuSide(side) ? `CPU ${LEVEL_LABEL[cpu!.level]}` : cpu ? 'あなた' : null}
      thinking={isCpuSide(side) && cpuThinking}
      game={game}
      selectedHandId={sel?.type === 'hand' ? sel.pieceId : null}
      handEnabled={handEnabled(side)}
      onHand={onHand}
      onSkill={onSkill}
      handRef={(el) => {
        handRefs.current[side] = el;
      }}
    />
  );

  return (
    <div className="screen screen-paper">
      <div style={{ height: compact ? 52 : 64, flex: '0 0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '2px solid var(--line)' }}>
        <span className="display" style={{ fontSize: compact ? 22 : 26, width: compact ? 200 : 380 }}>
          戦国将棋
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} aria-live="polite">
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>{over ? `${game.moveCount}手で けっちゃく` : `${game.moveCount + 1}手め`}</span>
          <span
            key={over ? 'over' : game.turn}
            className="turn-pill"
            style={{ background: over && game.draw ? '#5e5e5e' : turnFam.colors.border, boxShadow: over ? undefined : '0 0 0 3px #fff, 0 0 0 6px #ffc700' }}
          >
            {!over && game.turn === 'gote' && <span aria-hidden="true">◀</span>}
            {over
              ? game.draw
                ? 'ひきわけ'
                : `${FAMILIES[game.families[game.winner as Side]].army}の かち!`
              : isCpuTurn
                ? `${turnFam.army} (CPU) の 番`
                : cpu
                  ? 'あなたの 番だよ'
                  : `${turnFam.army}の 番だよ`}
            {!over && game.turn === 'sente' && <span aria-hidden="true">▶</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: compact ? 8 : 10, width: compact ? 340 : 380, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setRulesOpen(true)}>
            あそびかた
          </button>
          <button
            className="btn btn-ghost"
            aria-pressed={!muted}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          >
            おと {muted ? 'オフ' : 'オン'}
          </button>
          <button
            className="btn btn-ghost"
            style={confirmQuit ? { borderColor: 'var(--red)', color: 'var(--red)' } : undefined}
            onClick={() => (confirmQuit ? onQuit() : setConfirmQuit(true))}
          >
            {confirmQuit ? 'ほんとに おわる?' : 'おわる'}
          </button>
        </div>
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', gap: compact ? 16 : 24, padding: compact ? '10px 16px' : '16px 24px', minHeight: 0 }}>
        {panel('gote')}
        <main style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ height: compact ? 36 : 40 }} aria-live="polite">
            {toast ? (
              <div key={toast.key} className="toast">
                <span className="toast-label">{toast.label}</span>
                <span>{toast.text}</span>
              </div>
            ) : enemyTrying ? (
              <div key={`try-${game.moveCount}`} className="toast danger">
                {FAMILIES[game.families[opponent(game.turn)]].lord}が 本陣に のりこんできた!
              </div>
            ) : danger ? (
              <div key={`danger-${game.moveCount}`} className="toast danger">
                {turnFam.army}の 大将が あぶない!
              </div>
            ) : null}
          </div>
          <div className={`board-frame${theme ? ` theme-${theme.theme}` : ''}`}>
            <div className="board" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridTemplateRows: `repeat(${rows}, ${cell}px)` }}>
              {/* 大坂城のイラストは、豊臣方の陣の2段の 駒の うしろに 置く */}
              {theme && castleSide && (
                <div className="castle-art" style={{ top: castleSide === 'gote' ? 0 : (rows - 2) * cell }}>
                  <OsakaCastle width={cols * cell} height={2 * cell} theme={theme.theme} frontSide={castleSide === 'gote' ? 'bottom' : 'top'} />
                </div>
              )}
              {cells}
              {defenders.map((d) => (
                <div key={d.key} className="defender" style={{ left: d.at.x * cell, top: d.at.y * cell, width: cell, height: cell }}>
                  <PieceTile piece={d.piece} family={d.family} variant={variant} cell={cell} />
                </div>
              ))}
              {clashes.map((c) => (
                <Clash key={c.key} x={c.x} y={c.y} kind={c.kind} scale={cell / 96} />
              ))}
              {tryRun?.stage === 'exit' && (
                <div
                  className="try-exit"
                  style={{ left: tryRun.at.x * cell, top: tryRun.at.y * cell, width: cell, height: cell, '--ty': `${(tryRun.side === 'sente' ? -1 : 1) * cell * 1.8}px` } as React.CSSProperties}
                >
                  <PieceTile piece={tryRun.piece} family={tryRun.family} variant={variant} cell={cell} />
                </div>
              )}
              {tryRun?.stage === 'title' && (
                <div className="try-title" style={{ background: `${FAMILIES[tryRun.family].colors.border}e6` }}>
                  {Array.from({ length: 18 }, (_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="confetti"
                      style={{ left: `${(i * 37) % 100}%`, top: -30, width: i % 2 ? 10 : 16, height: i % 2 ? 16 : 9, background: TRY_COLORS[i % TRY_COLORS.length], animationDelay: `${-(i % 6) * 0.45}s`, animationDuration: '2.4s' }}
                    />
                  ))}
                  <span className="display try-word" style={{ fontSize: compact ? 64 : 84 }}>
                    トライ!
                  </span>
                  <span style={{ fontSize: compact ? 18 : 22, fontWeight: 800 }}>{FAMILIES[tryRun.family].lord}が 本陣に のりこんだ!</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ height: compact ? 40 : 44, display: 'flex', alignItems: 'center', gap: 12, fontSize: compact ? 17 : 16, fontWeight: 700, textAlign: 'center' }}>
            <span>{hint}</span>
            {hintButtons.map((b) => (
              <button key={b.label} className="btn btn-ghost" style={{ fontSize: 14 }} onClick={b.onClick}>
                {b.label}
              </button>
            ))}
          </div>
        </main>
        {panel('sente')}
      </div>

      {banner && (
        <div key={banner.key} className="skill-banner">
          <div className="skill-banner-inner" style={{ background: FAMILIES[banner.family].colors.tile }}>
            <Chara kind="K" family={banner.family} size={compact ? 120 : 150} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#8a5a00' }}>{FAMILIES[banner.family].skill.phrase}</span>
              <span className="display" style={{ fontSize: compact ? 52 : 64, lineHeight: 1.1 }}>
                {FAMILIES[banner.family].skill.name}
              </span>
            </div>
          </div>
        </div>
      )}
      {rulesOpen && <RulesDialog variant={variant} onClose={() => setRulesOpen(false)} />}
      {ghost && <FlyingPiece key={ghost.key} ghost={ghost} onDone={clearGhost} />}
    </div>
  );
}

function FlyingPiece({ ghost, onDone }: { ghost: Ghost; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return onDone();
    const anim = el.animate(
      [
        { transform: `translate(${ghost.from.x}px, ${ghost.from.y}px) scale(1) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${(ghost.from.x + ghost.to.x) / 2}px, ${Math.min(ghost.from.y, ghost.to.y) - 80}px) scale(1.1) rotate(180deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${ghost.to.x}px, ${ghost.to.y}px) scale(0.6) rotate(360deg)`, opacity: 0.2 },
      ],
      { duration: 700, easing: 'ease-in-out', fill: 'forwards' },
    );
    anim.onfinish = onDone;
    return () => anim.cancel();
  }, [ghost, onDone]);
  return (
    <div ref={ref} className="ghost" style={{ left: 0, top: 0 }}>
      <div className="tile" style={{ position: 'relative', left: 0, top: 0, ...tileColors(ghost.family, ghost.piece.owner) }}>
        <Chara kind={ghost.piece.kind} family={ghost.family} crop="bust" size={60} special={specialOf(ghost.piece.name, ghost.piece.originFamily)} />
        <span className="tile-name">{ghost.piece.name}</span>
      </div>
    </div>
  );
}

interface PanelProps {
  side: Side;
  compact: boolean;
  /** CPU と遊ぶとき「CPU よわい」「あなた」の札。2人なら null */
  cpuLabel: string | null;
  thinking: boolean;
  game: GameState;
  selectedHandId: string | null;
  handEnabled: boolean;
  onHand: (side: Side, pieceId: string) => void;
  onSkill: () => void;
  handRef: (el: HTMLElement | null) => void;
}

function SidePanel({ side, compact, cpuLabel, thinking, game, selectedHandId, handEnabled, onHand, onSkill, handRef }: PanelProps) {
  /** 顔アイコンと持ち駒タイルの大きさ */
  const face = compact ? 56 : 68;
  const hs = compact ? 64 : 72;
  const famId = game.families[side];
  const fam = FAMILIES[famId];
  const over = game.winner !== null || game.draw;
  const isTurn = game.turn === side && !over;
  const top = side === 'gote';

  // 持ち駒は 種類・名前・元の家 ごとにまとめる
  const groups = new Map<string, Piece[]>();
  for (const p of game.hands[side]) {
    const key = `${p.kind}|${p.name}|${p.originFamily}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  let skillLabel = 'つかう!';
  let skillEnabled = false;
  if (game.skillUsed[side]) skillLabel = 'つかった';
  else if (game.skillPhase && isTurn) skillLabel = 'はつどう中…';
  else if (cpuLabel?.startsWith('CPU')) skillLabel = 'CPUが つかうよ';
  else if (!isTurn) skillLabel = 'あいての 番だよ';
  else if (!canActivateSkill(game)) skillLabel = 'いまは つかえない';
  else skillEnabled = true;

  const header = (
    <div
      className={`turn-header${isTurn ? ' active' : ''}${!isTurn && !over ? ' waiting' : ''}`}
      style={{
        position: 'relative', background: fam.colors.border, color: '#fff', borderRadius: 20, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      {isTurn && <span className="turn-halo" />}
      <div style={{ position: 'relative', width: face, height: face, flex: '0 0 auto' }}>
        {isTurn && <span className="turn-face-halo" />}
        <div style={{ position: 'relative', width: face, height: face, borderRadius: face / 2, background: fam.colors.tile, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: isTurn ? '0 0 0 4px #ffc700' : undefined }}>
          <Chara kind="K" family={famId} crop="bust" size={face - 2} title={fam.lord} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: fam.army.length > 3 ? 21 : compact ? 24 : 26, fontWeight: 800, lineHeight: 1.1 }}>{fam.army}</span>
        <span style={{ fontSize: compact ? 14 : 13, fontWeight: 700 }}>
          {side === 'sente' ? '先手' : '後手'} ・ 大将 {fam.lord}
        </span>
      </div>
      {isTurn && <span key={`badge-${game.moveCount}`} className="turn-badge">{thinking ? 'かんがえ中…' : 'いまの番!'}</span>}
      {cpuLabel && <span className={`who-badge${cpuLabel.startsWith('CPU') ? ' cpu' : ''}`}>{cpuLabel}</span>}
      {game.shield === side && <span style={{ position: 'absolute', left: 12, top: -10, padding: '3px 10px', borderRadius: 12, background: '#7fd3ff', color: '#13324a', fontSize: 13, fontWeight: 800, border: '2px solid #fff' }}>守り中</span>}
    </div>
  );

  const skill = (
    <div
      className="card"
      title={fam.skill.desc}
      style={{ padding: compact ? '10px 14px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6, borderColor: skillEnabled ? '#f5c542' : undefined, borderWidth: skillEnabled ? 3 : 2 }}
    >
      <span className="label-gold" style={compact ? { fontSize: 14 } : undefined}>
        ひっさつわざ{compact ? '' : ' (1かいだけ)'}
      </span>
      <span style={{ fontSize: compact ? 21 : 22, fontWeight: 800, lineHeight: 1.2 }}>{fam.skill.name}</span>
      {/* スマホでは説明を省く (技を使うと、盤の下の案内で何をするか出る) */}
      {!compact && (
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: '#4a3b2c' }}>
          {fam.skill.desc}
          {game.variant === 'small' && fam.skill.smallNote ? ` ※${fam.skill.smallNote}` : ''}
        </span>
      )}
      <button className="btn btn-primary" disabled={!skillEnabled} onClick={onSkill} style={{ marginTop: 4, height: compact ? 48 : 52, borderRadius: 26, fontSize: skillEnabled ? 20 : 17, letterSpacing: '0.05em' }}>
        {skillLabel}
      </button>
    </div>
  );

  const hand = (
    <div ref={handRef} className="card" style={{ padding: compact ? '10px 12px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12, flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
      <span className="label" style={compact ? { fontSize: 14 } : undefined}>
        もちごま{compact ? '' : ' (寝返った駒)'}
      </span>
      <div style={{ display: 'flex', gap: compact ? 10 : 14, flexWrap: 'wrap' }}>
        {[...groups.values()].map((ps) => {
          const p = ps[0];
          const selected = ps.some((x) => x.id === selectedHandId);
          const origin = p.originFamily !== famId ? FAMILIES[p.originFamily].name.replace(/家$/, '') : null;
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button
                className={`hand-tile${selected ? ' selected' : ''}`}
                style={{ ...tileColors(famId, side), width: hs, height: hs }}
                disabled={!handEnabled}
                aria-label={`もちごま ${p.name} ${ps.length}まい`}
                onClick={() => onHand(side, p.id)}
              >
                <Chara kind={p.kind} family={famId} crop="bust" size={Math.round(hs * 0.64)} special={specialOf(p.name, p.originFamily)} />
                <span style={{ fontSize: p.name.length > 4 ? 9 : 11, fontWeight: 800, lineHeight: 1, color: '#3a2a1f', whiteSpace: 'nowrap' }}>{p.name}</span>
                <DirDots box={hs} half={hs / 2 - 1} dirs={directions(p, game.variant)} color={fam.colors.border} offset={3} />
              </button>
              {(ps.length > 1 || origin) && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {ps.length > 1 && <span className="hand-count">×{ps.length}</span>}
                  {origin && <span className="hand-origin">元{origin}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {groups.size === 0 && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>まだ ないよ</span>}
      {groups.size > 0 && handEnabled && !compact && <span style={{ marginTop: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>タップすると 打てるマスが 光るよ</span>}
    </div>
  );

  return (
    <aside style={{ width: compact ? 250 : 300, flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={`${fam.army} (${side === 'sente' ? '先手' : '後手'})`}>
      {top ? (
        <>
          {header}
          {skill}
          {hand}
        </>
      ) : (
        <>
          {hand}
          {skill}
          {header}
        </>
      )}
    </aside>
  );
}
