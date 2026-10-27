import { useCallback, useState } from 'react';
import type { FamilyId } from '../data/families';
import { BATTLES, BATTLE_IDS, type BattleId } from '../data/battles';
import { play } from '../audio/sound';
import { FamilyInfo } from './FamilyInfo';
import { RulesDialog } from './RulesDialog';
import { LordCarousel } from './LordCarousel';
import { Scenery } from './Scenery';
import { useStage } from './Stage';

export type PlayMode = 'solo' | 'duo';

/** ひとりで / ふたりで を押したあと、どのあそびかたにするかを選ぶ (battle が null なら大名のたたかい) */
export function TitleScreen({ onStart }: { onStart: (mode: PlayMode, battle: BattleId | null) => void }) {
  const { compact } = useStage();
  const [info, setInfo] = useState<FamilyId | null>(null);
  const closeInfo = useCallback(() => setInfo(null), []);
  const [rules, setRules] = useState(false);
  /** あそびかたを選ぶ窓 (押したのが ひとりで か ふたりで か) */
  const [menu, setMenu] = useState<PlayMode | null>(null);
  return (
    <div className="screen screen-sky">
      <Scenery />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: compact ? 6 : 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 6 }}>
          <div style={{ fontSize: compact ? 20 : 22, fontWeight: 800, letterSpacing: '0.3em', paddingLeft: '0.3em', color: 'var(--blue)' }}>せんごく しょうぎ</div>
          <h1 className="display" style={{ margin: 0, fontSize: compact ? 92 : 128, lineHeight: 1.05, textShadow: '0 6px 0 #fff' }}>
            戦国将棋
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: compact ? 20 : 22, fontWeight: 700, color: 'var(--blue)' }}>すきな大名をえらんで、あいての大将をとろう!</p>
        </div>
        <div style={{ marginTop: compact ? 0 : 16 }}>
          <LordCarousel onSelect={setInfo} stopped={info !== null} />
        </div>
        <div style={{ display: 'flex', gap: compact ? 24 : 32, marginTop: compact ? 6 : 12 }}>
          {(
            [
              ['solo', 'ひとりで あそぶ', 'CPUと たたかう'],
              ['duo', 'ふたりで あそぶ', 'おなじ たんまつで'],
            ] as const
          ).map(([mode, label, sub]) => (
            <button
              key={mode}
              className="btn btn-primary"
              style={{
                width: compact ? 300 : 330, height: compact ? 76 : 88, borderRadius: 44, flexDirection: 'column', gap: 2, lineHeight: 1.1,
                background: mode === 'duo' ? '#2e5e8c' : undefined, boxShadow: mode === 'duo' ? '0 6px 0 #1f4468' : undefined,
              }}
              onClick={() => {
                play('tap');
                setMenu(mode);
              }}
            >
              <span style={{ fontSize: compact ? 30 : 32, letterSpacing: '0.08em' }}>{label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.9 }}>{sub}</span>
            </button>
          ))}
        </div>
      </div>
      {/* スマホでは画面が低くボタンと重なるので出さない */}
      {!compact && (
        <div style={{ position: 'absolute', right: 40, bottom: 20, fontSize: 15, fontWeight: 700, color: '#1f3d1a' }}>大将を おすと 家紋と 武将が みられるよ</div>
      )}
      <button
        className="btn btn-ghost"
        style={{ position: 'absolute', top: compact ? 14 : 24, right: compact ? 20 : 32, background: '#fff', fontSize: 18, height: 48, padding: '0 22px', borderRadius: 24 }}
        onClick={() => {
          play('tap');
          setRules(true);
        }}
      >
        あそびかた
      </button>
      {menu && (
        <div className="info-backdrop" onClick={() => setMenu(null)}>
          <div
            className="info-card"
            role="dialog"
            aria-modal="true"
            aria-label="あそびかたを えらぶ"
            onClick={(e) => e.stopPropagation()}
            style={{ flexDirection: 'column', gap: compact ? 12 : 20, padding: compact ? '16px 32px 18px' : '28px 44px 30px', borderColor: menu === 'solo' ? '#d0392e' : '#2e5e8c', width: 760 }}
          >
            <h2 style={{ margin: 0, fontSize: compact ? 26 : 30, fontWeight: 800 }}>
              {menu === 'solo' ? 'ひとりで あそぶ' : 'ふたりで あそぶ'} ― どの たたかいに する?
            </h2>
            {/* 大名どうしの たたかい (ふつうの対戦) */}
            <button
              className="btn play-choice"
              style={{ width: '100%', height: compact ? 70 : 92 }}
              onClick={() => {
                play('tap');
                setMenu(null);
                onStart(menu, null);
              }}
            >
              <span style={{ fontSize: compact ? 26 : 32, letterSpacing: '0.05em' }}>大名どうしの たたかい</span>
              <span style={{ fontSize: compact ? 13 : 15, fontWeight: 700, opacity: 0.9 }}>12の 大名家から えらぶ</span>
            </button>
            {/* 歴史の たたかい (合戦モード)。年の順に並べる */}
            <div className="play-section">歴史の たたかい</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BATTLE_IDS.length}, 1fr)`, gap: compact ? 10 : 14, width: '100%' }}>
              {BATTLE_IDS.map((id) => (
                <button
                  key={id}
                  className="btn play-choice battle"
                  style={{ height: compact ? 64 : 80, borderRadius: 22 }}
                  onClick={() => {
                    play('tap');
                    setMenu(null);
                    onStart(menu, id);
                  }}
                >
                  <span style={{ fontSize: compact ? 20 : 23, letterSpacing: '0.03em' }}>{BATTLES[id].name}</span>
                  <span style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: '#ffe38a' }}>{BATTLES[id].year}年</span>
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={() => setMenu(null)}>
              もどる
            </button>
          </div>
        </div>
      )}
      {info && <FamilyInfo family={info} onClose={closeInfo} />}
      {rules && <RulesDialog onClose={() => setRules(false)} />}
    </div>
  );
}
