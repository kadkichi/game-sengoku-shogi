import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, type FamilyId } from '../data/families';
import {
  applyAction,
  canActivateSkill,
  createGame,
  directions,
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
import { PieceTile } from './PieceTile';
import { useStage } from './Stage';

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
const MOVE_SKILLS = new Set(['double', 'kingDouble', 'arrows', 'slideDiag', 'yukimura']);

interface Props {
  families: Record<Side, FamilyId>;
  variant: Variant;
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

export function BattleScreen({ families, variant, onFinish, onQuit }: Props) {
  const [game, setGame] = useState<GameState>(() => createGame(families, variant));
  const [sel, setSel] = useState<Selection>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [banner, setBanner] = useState<{ key: number; family: FamilyId } | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [justMoved, setJustMoved] = useState<string | null>(null);
  const [justPromoted, setJustPromoted] = useState<string | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [confirmQuit, setConfirmQuit] = useState(false);

  const { scale, ref: stageRef } = useStage();
  const cellRefs = useRef(new Map<string, HTMLElement>());
  const handRefs = useRef<Partial<Record<Side, HTMLElement | null>>>({});

  const cell = CELL[variant];
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
    if (phaseType === 'pull') return pullSources(game);
    if (MOVE_SKILLS.has(phaseType)) {
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
    if (!sel) return [];
    if (sel.type === 'hand') return legalDrops(game, sel.pieceId);
    if (phaseType === 'shoot') return shootTargets(game, sel.pos);
    if (phaseType === 'pull') return pullTargets(game, sel.pos);
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

    for (const ev of next.events) {
      switch (ev.type) {
        case 'move':
        case 'drop':
        case 'spawn':
          setJustMoved(ev.pieceId);
          sound ??= 'move';
          if (ev.type === 'spawn') say('一領具足!', '新しい 足軽が 出陣した');
          break;
        case 'pull':
          setJustMoved(ev.piece.id);
          sound ??= 'move';
          say('釣り野伏せ!', `${ev.piece.name}を ひきよせた`);
          break;
        case 'capture':
          sound = ev.by === 'shoot' ? 'shoot' : 'capture';
          if (ev.piece.kind === 'K') {
            say('勝負あり!', `大将 ${ev.piece.name}を とった!`);
          } else {
            say(ev.by === 'shoot' ? 'ズドン!' : '寝返り!', `${ev.piece.name}が ${army}に 寝返った`);
            const from = stagePoint(cellRefs.current.get(`${ev.at.x},${ev.at.y}`));
            const to = stagePoint(handRefs.current[side]);
            if (from && to) {
              setGhost({
                key: ++seq,
                piece: ev.piece,
                family: game.families[ev.piece.owner],
                from: { x: from.x + 6, y: from.y + 6 },
                to: { x: to.x + to.w / 2 - 42, y: to.y + to.h / 2 - 42 },
              });
            }
          }
          break;
        case 'promote':
          setJustPromoted(ev.piece.id);
          say(ev.piece.kind === 'P' ? '出世!' : '武勲!', ev.piece.kind === 'P' ? '足軽が 武将なみに つよくなった' : `${ev.piece.name}が 武勲を あげた`);
          if (sound !== 'capture' && sound !== 'shoot') sound = 'promote';
          break;
        case 'shield':
          say('小田原城!', `つぎの あいての番、${army}の駒は とられない`);
          break;
        case 'undo':
          say('まった!', `${FAMILIES[game.families[opponent(side)]].army}の さっきの手を なかったことにした`);
          break;
        case 'win':
          if (ev.reason === 'try') say('トライ!', `${FAMILIES[game.families[ev.side]].lord}が 本陣に のりこんだ!`);
          break;
      }
    }
    if (sound) play(sound);
    if (next.winner || next.draw) {
      setTimeout(() => play(next.winner ? 'win' : 'draw'), 400);
      setTimeout(() => onFinish({ winner: next.winner, winReason: next.winReason, families, variant, moveCount: next.moveCount }), 1800);
    }
    setGame(next);
    setSel(null);
  };

  const clearGhost = useCallback(() => setGhost(null), []);

  // ---- 操作 ----
  const onCell = (pos: Pos) => {
    if (over) return;
    if (phaseType === 'spawn') {
      if (isTarget(pos)) dispatch({ type: 'spawn', to: pos });
      return;
    }
    if (phaseType === 'shoot' || phaseType === 'pull') {
      if (sel?.type === 'board' && isTarget(pos)) return dispatch({ type: phaseType, from: sel.pos, to: pos });
      if (sources.some((p) => samePos(p, pos))) {
        play('select');
        return setSel({ type: 'board', pos });
      }
      return setSel(null);
    }
    if (sel && isTarget(pos)) {
      return sel.type === 'board'
        ? dispatch({ type: 'move', from: sel.pos, to: pos })
        : dispatch({ type: 'drop', pieceId: sel.pieceId, to: pos });
    }
    const piece = pieceAt(game, pos);
    if (piece && piece.owner === game.turn && legalMoves(game, pos).length > 0) {
      if (sel?.type === 'board' && samePos(sel.pos, pos)) return setSel(null);
      play('select');
      return setSel({ type: 'board', pos });
    }
    setSel(null);
  };

  const handEnabled = (side: Side) => !over && side === game.turn && (!phase || phaseType === 'drop2');
  const onHand = (side: Side, pieceId: string) => {
    if (!handEnabled(side)) return;
    if (sel?.type === 'hand' && sel.pieceId === pieceId) return setSel(null);
    play('select');
    setSel({ type: 'hand', pieceId });
  };

  const onSkill = () => {
    if (!canActivateSkill(game)) return;
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
  if (over) {
    hint = game.draw ? 'おなじ局面が 3かい。ひきわけ!' : `${FAMILIES[game.families[game.winner as Side]].army}の かち!`;
  } else if (phase) {
    const step = phase.step;
    switch (phase.type) {
      case 'shoot':
        hint = sel ? '撃つ あいてを えらんでね' : '撃つ 足軽を えらんでね (光っている足軽)';
        break;
      case 'pull':
        hint = sel ? 'ひきよせる マスを えらんでね' : 'ひきよせる あいての駒を えらんでね (光っている駒)';
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
      case 'yukimura':
        hint = '真田幸村を まっすぐ前に すすめよう';
        break;
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
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const pos = { x, y };
      const piece = game.board[y][x];
      const target = isTarget(pos);
      const selected = sel?.type === 'board' && samePos(sel.pos, pos);
      const isSource = !selected && sources.some((p) => samePos(p, pos));
      const label = `${cols - x}の${rows - y}${piece ? ` ${FAMILIES[game.families[piece.owner]].army}の${piece.name}` : ''}${target ? ' (ここに うごける)' : ''}`;
      cells.push(
        <button
          key={`${x},${y}`}
          ref={(el) => {
            if (el) cellRefs.current.set(`${x},${y}`, el);
          }}
          className={`cell${x < cols - 1 ? ' line-r' : ''}${y < rows - 1 ? ' line-b' : ''}${variant === 'small' && (y === 0 || y === rows - 1) ? ' zone' : ''}`}
          aria-label={label}
          onClick={() => onCell(pos)}
        >
          {target && !piece && <span className="move-dot" style={{ left: cell / 2 - 18, top: cell / 2 - 18 }} />}
          {piece && (
            <PieceTile
              piece={piece}
              family={game.families[piece.owner]}
              variant={variant}
              cell={cell}
              selected={selected}
              target={target}
              shooter={isSource}
              shielded={game.shield === piece.owner}
              justMoved={justMoved === piece.id}
              justPromoted={justPromoted === piece.id}
            />
          )}
          {target && piece && <span className={`tag${phaseType === 'shoot' ? ' tag-shoot' : ''}`}>{phaseType === 'shoot' ? 'うつ!' : 'とれる!'}</span>}
        </button>,
      );
    }
  }

  const panel = (side: Side) => (
    <SidePanel
      side={side}
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
      <div style={{ height: 64, flex: '0 0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '2px solid var(--line)' }}>
        <span className="display" style={{ fontSize: 26, width: 260 }}>
          戦国将棋
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} aria-live="polite">
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>{over ? `${game.moveCount}手で けっちゃく` : `${game.moveCount + 1}手め`}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 22px', borderRadius: 20, background: over && game.draw ? '#5e5e5e' : turnFam.colors.border, color: '#fff', fontSize: 18, fontWeight: 800 }}>
            {over ? (game.draw ? 'ひきわけ' : `${FAMILIES[game.families[game.winner as Side]].army}の かち!`) : `${turnFam.army}の 番だよ`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, width: 260, justifyContent: 'flex-end' }}>
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

      <div style={{ flex: '1 1 auto', display: 'flex', gap: 24, padding: '16px 24px' }}>
        {panel('gote')}
        <main style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 40 }} aria-live="polite">
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
          <div className="board-frame">
            <div className="board" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridTemplateRows: `repeat(${rows}, ${cell}px)` }}>
              {cells}
            </div>
          </div>
          <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700 }}>
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
            <Chara kind="K" family={banner.family} size={150} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#8a5a00' }}>{FAMILIES[banner.family].skill.phrase}</span>
              <span className="display" style={{ fontSize: 64, lineHeight: 1.1 }}>
                {FAMILIES[banner.family].skill.name}
              </span>
            </div>
          </div>
        </div>
      )}
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
  const c = FAMILIES[ghost.family].colors;
  return (
    <div ref={ref} className="ghost" style={{ left: 0, top: 0 }}>
      <div className="tile" style={{ position: 'relative', left: 0, top: 0, background: c.tile, borderColor: c.border }}>
        <Chara kind={ghost.piece.kind} family={ghost.family} crop="bust" size={60} special={specialOf(ghost.piece.name, ghost.piece.originFamily)} />
        <span className="tile-name">{ghost.piece.name}</span>
      </div>
    </div>
  );
}

interface PanelProps {
  side: Side;
  game: GameState;
  selectedHandId: string | null;
  handEnabled: boolean;
  onHand: (side: Side, pieceId: string) => void;
  onSkill: () => void;
  handRef: (el: HTMLElement | null) => void;
}

function SidePanel({ side, game, selectedHandId, handEnabled, onHand, onSkill, handRef }: PanelProps) {
  const famId = game.families[side];
  const fam = FAMILIES[famId];
  const isTurn = game.turn === side && game.winner === null && !game.draw;
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
  else if (!isTurn) skillLabel = 'あいての 番だよ';
  else if (!canActivateSkill(game)) skillLabel = 'いまは つかえない';
  else skillEnabled = true;

  const header = (
    <div
      style={{
        position: 'relative', background: fam.colors.border, color: '#fff', borderRadius: 20, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: isTurn ? '0 0 0 4px #ffc700' : undefined,
      }}
    >
      <div style={{ width: 68, height: 68, borderRadius: 34, background: fam.colors.tile, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: '0 0 auto' }}>
        <Chara kind="K" family={famId} crop="bust" size={66} title={fam.lord} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: fam.army.length > 3 ? 21 : 26, fontWeight: 800, lineHeight: 1.1 }}>{fam.army}</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {side === 'sente' ? '先手' : '後手'} ・ 大将 {fam.lord}
        </span>
      </div>
      {isTurn && <span style={{ position: 'absolute', right: 12, top: -10, padding: '3px 10px', borderRadius: 12, background: '#ffc700', color: '#2b2b2b', fontSize: 13, fontWeight: 800, border: '2px solid #fff' }}>いまの番</span>}
      {game.shield === side && <span style={{ position: 'absolute', left: 12, top: -10, padding: '3px 10px', borderRadius: 12, background: '#7fd3ff', color: '#13324a', fontSize: 13, fontWeight: 800, border: '2px solid #fff' }}>守り中</span>}
    </div>
  );

  const skill = (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderColor: skillEnabled ? '#f5c542' : undefined, borderWidth: skillEnabled ? 3 : 2 }}>
      <span className="label-gold">ひっさつわざ (1かいだけ)</span>
      <span style={{ fontSize: 22, fontWeight: 800 }}>{fam.skill.name}</span>
      <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: '#4a3b2c' }}>
        {fam.skill.short}
        {game.variant === 'small' && fam.skill.smallNote ? ` ※${fam.skill.smallNote}` : ''}
      </span>
      <button className="btn btn-primary" disabled={!skillEnabled} onClick={onSkill} style={{ marginTop: 4, height: 52, borderRadius: 26, fontSize: skillEnabled ? 20 : 17, letterSpacing: '0.05em' }}>
        {skillLabel}
      </button>
    </div>
  );

  const hand = (
    <div ref={handRef} className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto' }}>
      <span className="label">もちごま (寝返った駒)</span>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[...groups.values()].map((ps) => {
          const p = ps[0];
          const selected = ps.some((x) => x.id === selectedHandId);
          const origin = p.originFamily !== famId ? FAMILIES[p.originFamily].name.replace(/家$/, '') : null;
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button
                className={`hand-tile${selected ? ' selected' : ''}`}
                style={{ background: fam.colors.tile, borderColor: fam.colors.border }}
                disabled={!handEnabled}
                aria-label={`もちごま ${p.name} ${ps.length}まい`}
                onClick={() => onHand(side, p.id)}
              >
                <Chara kind={p.kind} family={famId} crop="bust" size={46} special={specialOf(p.name, p.originFamily)} />
                <span style={{ fontSize: p.name.length > 4 ? 9 : 11, fontWeight: 800, lineHeight: 1, color: '#3a2a1f', whiteSpace: 'nowrap' }}>{p.name}</span>
                {directions(p, game.variant).map(([dx, dy]) => (
                  <span
                    key={`${dx},${dy}`}
                    className="dir-dot"
                    style={{ width: 10, height: 10, left: 36 + dx * 36 - 5, top: 36 + dy * 36 - 5, background: fam.colors.border }}
                  />
                ))}
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
      {groups.size > 0 && handEnabled && <span style={{ marginTop: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>タップすると 打てるマスが 光るよ</span>}
    </div>
  );

  return (
    <aside style={{ width: 300, flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={`${fam.army} (${side === 'sente' ? '先手' : '後手'})`}>
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
