import { FAMILIES } from '../data/families';
import type { Side } from '../engine/types';
import type { BattleResult } from './BattleScreen';
import type { CpuSetting } from '../ai/cpu';
import { Chara } from './Chara';
import { Scenery } from './Scenery';
import { useStage } from './Stage';

interface Props {
  result: BattleResult;
  /** CPU と対戦したときの設定 (「あなたの かち」を出すため) */
  cpu: CpuSetting | null;
  onRematch: () => void;
  onReselect: () => void;
  onTitle: () => void;
}

const COLORS = ['#E2483D', '#F5C033', '#2F80ED', '#F2994A', '#7CC86E', '#23407A'];

export function ResultScreen({ result, cpu, onRematch, onReselect, onTitle }: Props) {
  const { w, compact } = useStage();
  const { winner, families, moveCount } = result;
  const loser: Side | null = winner ? (winner === 'sente' ? 'gote' : 'sente') : null;
  const winFam = winner ? FAMILIES[families[winner]] : null;

  return (
    <div className="screen screen-sky">
      <Scenery hillTop={0.75} />
      {winner &&
        Array.from({ length: 28 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="confetti"
            style={{
              left: (i * 61) % w,
              top: -40,
              width: i % 2 ? 14 : 22,
              height: i % 2 ? 22 : 12,
              background: COLORS[i % COLORS.length],
              animationDelay: `${(i * 0.37) % 3}s`,
              animationDuration: `${2.6 + (i % 5) * 0.4}s`,
            }}
          />
        ))}

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: compact ? 720 : 800, borderRadius: 36, background: '#fff', border: '4px solid #2b2b2b', boxShadow: '0 10px 0 #2b2b2b',
            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: compact ? '20px 32px 28px' : '36px 40px 44px', gap: compact ? 4 : 6,
          }}
        >
          <span style={{ fontSize: compact ? 20 : 22, fontWeight: 800, letterSpacing: '0.3em', paddingLeft: '0.3em', color: '#b35a00' }}>
            {!winner ? 'しょうぶ つかず' : !cpu ? 'しょうぶあり!' : winner === cpu.side ? 'CPUの かち… もういっかい!' : 'あなたの かち!'}
          </span>
          <h1 className="display" style={{ margin: 0, fontSize: compact ? 64 : 84, lineHeight: 1.15 }}>
            {winFam ? `${winFam.name}の かち!` : 'ひきわけ!'}
          </h1>
          <div style={{ marginTop: 4, height: compact ? 170 : 230, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            {winner ? (
              <div className="bob">
                <Chara kind="K" family={families[winner]} mood="happy" size={compact ? 150 : 212} title={FAMILIES[families[winner]].lord} />
              </div>
            ) : (
              (['sente', 'gote'] as Side[]).map((s) => <Chara key={s} kind="K" family={families[s]} size={compact ? 140 : 180} title={FAMILIES[families[s]].lord} />)
            )}
          </div>
          <p style={{ margin: compact ? '6px 0 0' : '14px 0 0', fontSize: compact ? 21 : 22, fontWeight: 800 }}>
            {!loser
              ? 'おなじ局面が 3かい くりかえされたよ'
              : result.winReason === 'try'
                ? `${FAMILIES[families[winner as Side]].lord}が あいての本陣に のりこんだ! (トライ)`
                : `あいての大将 ${FAMILIES[families[loser]].lord}を とったよ!`}
          </p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>{moveCount}手で けっちゃく</p>
          <div style={{ marginTop: compact ? 14 : 22, display: 'flex', gap: 20 }}>
            <button className="btn btn-primary" style={{ width: 260, height: compact ? 62 : 68, borderRadius: 34, fontSize: 24 }} onClick={onRematch}>
              もういっかい
            </button>
            <button
              className="btn"
              style={{ width: 260, height: compact ? 62 : 68, borderRadius: 34, fontSize: 20, background: '#fff', color: 'var(--blue)', border: '3px solid var(--blue)', boxShadow: '0 6px 0 var(--line)' }}
              onClick={onReselect}
            >
              大名を えらびなおす
            </button>
          </div>
        </div>
      </div>
      <button className="btn btn-ghost" style={{ position: 'absolute', right: 32, bottom: compact ? 14 : 24 }} onClick={onTitle}>
        タイトルへ
      </button>
    </div>
  );
}
