import { useState } from 'react';
import { FAMILIES, FAMILY_IDS } from '../data/families';
import type { Kind, Piece, Variant } from '../engine/types';
import { play } from '../audio/sound';
import { PieceTile } from './PieceTile';
import { useStage } from './Stage';

const PAGES = ['駒の うごき', 'かちかた', '寝返り・もちごま', '出世', 'ひっさつわざ'] as const;

const sample = (kind: Kind, promoted = false): Piece => ({
  id: `rule-${kind}${promoted ? '+' : ''}`,
  kind,
  owner: 'sente',
  promoted,
  name: { K: '織田信長', G: '柴田勝家', S: '羽柴秀吉', P: '足軽' }[kind],
  originFamily: 'oda',
});

/**
 * あそびかた。タイトル画面と合戦画面から開く。
 * variant を渡すと (合戦中)、そのモードのルールだけを出す
 */
export function RulesDialog({ variant, onClose }: { variant?: Variant; onClose: () => void }) {
  const { compact } = useStage();
  const [page, setPage] = useState(0);
  const go = (p: number) => {
    play('tap');
    setPage(p);
  };
  const v: Variant = variant ?? 'small';
  const cell = compact ? 84 : 96;

  const Tile = ({ kind, promoted, label }: { kind: Kind; promoted?: boolean; label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: cell, height: cell }}>
        <PieceTile piece={sample(kind, promoted)} family="oda" variant={v} cell={cell} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 800 }}>{label}</span>
    </div>
  );

  const body = [
    // 駒のうごき
    <div key="move" className="rules-page">
      <p className="rules-lead">駒の まわりの 点の むきに、1マス うごける</p>
      <div style={{ display: 'flex', gap: 28, justifyContent: 'center' }}>
        <Tile kind="K" label="大将" />
        <Tile kind="G" label="金の武将" />
        <Tile kind="S" label="銀の武将" />
        <Tile kind="P" label="足軽" />
      </div>
      <ul className="rules-list">
        <li>あいての駒が いる マスに うごくと、その駒を とれる</li>
        <li>自分の駒が いる マスには うごけない</li>
        {!variant && <li>じっくり (5×6) では 金と銀の うごきが すこし ちがう。盤の 駒の 点を 見てね</li>}
      </ul>
    </div>,

    // かちかた
    <div key="win" className="rules-page">
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'center' }}>
        {v === 'small' && (
          <div className="rules-board" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => {
              const y = Math.floor(i / 3);
              return (
                <div key={i} className={`rules-cell${y === 0 ? ' try' : y === 3 ? ' zone' : ''}`}>
                  {i === 0 && <span className="rules-chip lord">大将</span>}
                  {i === 5 && <span className="rules-chip enemy">金</span>}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
          <p className="rules-lead" style={{ textAlign: 'left' }}>かちかた</p>
          <div className="rules-box">① あいての 大将を とったら かち</div>
          {v === 'small' && (
            <div className="rules-box try">
              ② <b>トライ</b>: 自分の 大将が、あいての 一番奥の段 (黄色) に 入って、つぎの あいての番で とられなければ かち
            </div>
          )}
          {!variant && <div className="rules-note">トライが あるのは かんたん (3×4) だけ。じっくり (5×6) は 大将を とるしか ない</div>}
          {variant === 'large' && <div className="rules-note">じっくり (5×6) には トライは ないよ</div>}
          <div className="rules-note">おなじ 盤の形が 3かい でたら ひきわけ</div>
        </div>
      </div>
    </div>,

    // 寝返り・もちごま
    <div key="hand" className="rules-page">
      <p className="rules-lead">とった駒は 寝返って、自分の「もちごま」に なる</p>
      <ul className="rules-list">
        <li>寝返った駒は、自分の 家の 色に かわる (武将の 名前は そのまま)</li>
        <li>自分の番に、もちごまを おして、空いている マスに 打てる (これで 1手)</li>
        <li>足軽は、あいての 一番奥の段には 打てない (うごけなく なるから)</li>
        <li>出世していた駒を とると、もとの駒に もどる</li>
      </ul>
    </div>,

    // 出世
    <div key="promote" className="rules-page">
      <p className="rules-lead">あいての陣に 入ると、駒が つよくなる</p>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center', justifyContent: 'center' }}>
        <Tile kind="P" label="足軽" />
        <span style={{ fontSize: 36, color: '#c98a00' }}>▶</span>
        <Tile kind="P" promoted label="出世した足軽" />
      </div>
      <ul className="rules-list">
        <li>
          足軽が あいての陣 ({variant === 'large' ? '奥2段' : variant === 'small' ? '一番奥の段' : 'かんたんは 一番奥の段、じっくりは 奥2段'}) に 入ると「出世」。金色の 点の むきに うごけるように なる
        </li>
        {variant !== 'small' && <li>じっくり (5×6) では、銀の武将も あいての陣で「武勲」を あげて、おなじように つよくなる</li>}
        <li>出世は 自動。とられると もとに もどる</li>
      </ul>
    </div>,

    // ひっさつわざ
    <div key="skill" className="rules-page">
      <p className="rules-lead">ひっさつわざは 1局に 1かいだけ。自分の番に「つかう!」を おす</p>
      <div className="rules-skills">
        {FAMILY_IDS.map((id) => {
          const f = FAMILIES[id];
          return (
            <div key={id} className="rules-skill">
              <span className="rules-skill-name" style={{ background: f.colors.border }}>
                {f.name.replace(/家$/, '')}
              </span>
              <span>
                <b>{f.skill.name}</b> {f.skill.desc}
                {v === 'small' && f.skill.smallNote ? ` ※かんたんでは ${f.skill.smallNote}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>,
  ];

  return (
    <div className="info-backdrop" onClick={onClose}>
      <div
        className="info-card"
        role="dialog"
        aria-modal="true"
        aria-label="あそびかた"
        onClick={(e) => e.stopPropagation()}
        style={{ flexDirection: 'column', alignItems: 'stretch', gap: compact ? 10 : 16, padding: compact ? '16px 28px' : '24px 36px', borderColor: '#6b3fa0', width: 1000, height: compact ? 520 : 640 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="display" style={{ margin: 0, fontSize: compact ? 30 : 36, fontWeight: 400 }}>
            あそびかた
          </h2>
          <button className="btn btn-ghost" onClick={onClose}>
            とじる
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }} role="tablist">
          {PAGES.map((label, i) => (
            <button key={label} role="tab" aria-selected={page === i} className={`rules-tab${page === i ? ' on' : ''}`} onClick={() => go(i)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>{body[page]}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" style={{ visibility: page > 0 ? 'visible' : 'hidden' }} onClick={() => go(page - 1)}>
            ◀ まえ
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>
            {page + 1} / {PAGES.length}
          </span>
          {page < PAGES.length - 1 ? (
            <button className="btn btn-primary" style={{ height: 48, padding: '0 28px', borderRadius: 24, fontSize: 18 }} onClick={() => go(page + 1)}>
              つぎ ▶
            </button>
          ) : (
            <button className="btn btn-primary" style={{ height: 48, padding: '0 28px', borderRadius: 24, fontSize: 18 }} onClick={onClose}>
              わかった!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
