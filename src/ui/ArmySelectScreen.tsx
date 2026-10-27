import { useState } from 'react';
import { FAMILIES, type ArmyId, type FamilyId } from '../data/families';
import type { BattleDef } from '../data/battles';
import type { Side } from '../engine/types';
import type { CpuSetting } from '../ai/cpu';
import { play } from '../audio/sound';
import { Chara } from './Chara';
import { Crest } from './FamilyInfo';
import { LevelPicker, SIDE_COLOR, SIDE_NAME, other } from './SelectScreen';
import { useStage } from './Stage';

interface Props {
  battle: BattleDef;
  initial: Record<Side, FamilyId>;
  initialCpu: CpuSetting | null;
  /** タイトル画面で「ひとりで あそぶ」を選んだか */
  solo: boolean;
  onBack: () => void;
  onStart: (armies: Record<Side, ArmyId>, cpu: CpuSetting | null) => void;
}

/** 合戦モード (関ヶ原など) で、どちらの軍につくかを選ぶ画面 */
export function ArmySelectScreen({ battle, initial, initialCpu, solo, onBack, onStart }: Props) {
  const { compact } = useStage();
  const [a, b] = battle.armies;
  /** ひとりで: あなたの軍 / ふたりで: 先手の軍 */
  const [picked, setPicked] = useState<ArmyId>(() => {
    const humanSide = initialCpu ? other(initialCpu.side) : 'sente';
    const cur = initial[humanSide];
    return cur === a || cur === b ? cur : a;
  });
  /** ひとりで: あなたが指す側 */
  const [humanSide, setHumanSide] = useState<Side>(initialCpu ? other(initialCpu.side) : 'sente');
  const [askLevel, setAskLevel] = useState(false);

  const otherArmy = (id: ArmyId) => (id === a ? b : a);
  const armies: Record<Side, ArmyId> = solo
    ? ({ [humanSide]: picked, [other(humanSide)]: otherArmy(picked) } as Record<Side, ArmyId>)
    : { sente: picked, gote: otherArmy(picked) };
  const sideOf = (id: ArmyId): Side => (armies.sente === id ? 'sente' : 'gote');

  const card = (id: ArmyId) => {
    const f = FAMILIES[id];
    const side = sideOf(id);
    const mine = solo && id === picked;
    const roster = [...f.gold, ...f.silver, ...(f.vanguard ?? [])];
    return (
      <button
        key={id}
        className="army-card"
        aria-pressed={id === picked}
        onClick={() => {
          play('select');
          setPicked(id);
        }}
        style={{ borderColor: f.colors.border, boxShadow: id === picked ? `0 0 0 6px #ffc700, 0 8px 0 ${f.colors.border}` : `0 6px 0 ${f.colors.border}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16 }}>
          <div className="army-flag" style={{ background: f.colors.border }}>
            <Crest family={id} size={compact ? 40 : 52} />
            <span>{f.name}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, flex: '1 1 auto' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="army-badge" style={{ background: SIDE_COLOR[side] }}>
                {SIDE_NAME[side]}
              </span>
              {solo && (
                <span className="army-badge" style={{ background: mine ? '#ffc700' : '#8a8a8a', color: mine ? '#3a2a1f' : '#fff' }}>
                  {mine ? 'あなた' : 'CPU'}
                </span>
              )}
            </div>
            {/* 見出しの太字フォントには無い漢字があるので、ふつうの太字で出す */}
            <span style={{ fontSize: compact ? 30 : 38, fontWeight: 800, lineHeight: 1.1 }}>
              {f.name} {f.lord}
            </span>
          </div>
          <Chara kind="K" family={id} crop="bust" size={compact ? 90 : 140} />
        </div>
        <div className="army-chips">
          {roster.map((n) => (
            <span key={n} className="army-chip" style={{ borderColor: f.colors.border, background: f.colors.tile }}>
              {n}
            </span>
          ))}
        </div>
        <div className="army-skill">
          <span style={{ color: '#8a5a00', fontWeight: 800 }}>ひっさつわざ「{f.skill.name}」</span>
          <span>{f.skill.desc}</span>
        </div>
      </button>
    );
  };

  const segment = <T extends string>(label: string, items: [T, string, string][], value: T, set: (v: T) => void) => (
    <div role="radiogroup" aria-label={label} className="segment" style={{ width: compact ? 300 : 340 }}>
      {items.map(([v, text, color]) => {
        const on = v === value;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={on}
            className="btn"
            onClick={() => {
              play('select');
              set(v);
            }}
            style={{ flex: '1 1 0', height: compact ? 44 : 44, borderRadius: 20, fontSize: compact ? 17 : 17, background: on ? color : 'transparent', color: on ? '#fff' : color }}
          >
            {text}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="screen screen-paper">
      <div style={{ height: compact ? 56 : 68, flex: '0 0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '2px solid var(--line)' }}>
        <button className="btn btn-ghost" style={{ height: compact ? 42 : 46, borderRadius: 23, fontSize: 17, width: 128 }} onClick={onBack}>
          ← もどる
        </button>
        <h1 style={{ margin: 0, fontSize: compact ? 26 : 32, fontWeight: 800, letterSpacing: '0.1em' }}>{battle.name}</h1>
        <div style={{ width: 128 }} />
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 10 : 18, padding: compact ? '10px 20px' : '20px 32px', minHeight: 0 }}>
        <div style={{ fontSize: compact ? 20 : 24, fontWeight: 800 }}>
          {battle.question} {solo ? '(押した ほうが あなたの軍)' : '(押した ほうが 先手)'}
        </div>
        <div style={{ display: 'flex', gap: compact ? 16 : 28, width: '100%', flex: '1 1 auto', minHeight: 0 }}>
          {card(a)}
          {card(b)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 14 : 20 }}>
          {solo && segment<Side>('あなたが 指す側', [['sente', 'あなたが 先手', SIDE_COLOR.sente], ['gote', 'あなたが 後手', SIDE_COLOR.gote]], humanSide, setHumanSide)}
          <button
            className="btn btn-primary"
            style={{ width: compact ? 220 : 260, height: compact ? 56 : 62, borderRadius: 34, fontSize: compact ? 26 : 30, letterSpacing: '0.15em', paddingLeft: '0.15em' }}
            onClick={() => {
              if (solo) {
                play('tap');
                setAskLevel(true);
                return;
              }
              play('horagai');
              onStart(armies, null);
            }}
          >
            かいせん!
          </button>
        </div>
      </div>
      {askLevel && (
        <LevelPicker
          onCancel={() => setAskLevel(false)}
          onPick={(level) => {
            play('horagai');
            onStart(armies, { side: other(humanSide), level });
          }}
        />
      )}
    </div>
  );
}
