import { FAMILIES, FAMILY_IDS, type FamilyId } from '../data/families';
import type { Kind, Piece } from '../engine/types';
import { Chara } from './Chara';
import { Crest } from './FamilyInfo';
import { PieceTile } from './PieceTile';

/**
 * 開発用: 盤と駒を紙に印刷して遊ぶための A4 ページ。URL に ?print をつけると表示する。
 * 1ページ目 (A4 横) が盤とルール、2ページ目から (A4 たて) が各家の駒と必殺技
 */
const MM = 96 / 25.4;
const px = (mm: number) => Math.round(mm * MM);

/** 駒1つの大きさ (mm)。盤のマス (42mm) に収まるようにする */
const PIECE = 36;
/** 切り取る1面の大きさ (mm)。駒のまわりの点まで入るように少し大きくする */
const FACE = 41;
const CELL = 42;

const make = (family: FamilyId, kind: Kind, name: string, promoted = false): Piece => ({
  id: `${family}-${kind}-${name}-${promoted}`,
  kind,
  owner: 'sente',
  promoted,
  name,
  originFamily: family,
});

/** 切り取って、まんなかで折って はり合わせる駒。上半分がうら (逆さま)、下半分がおもて */
function FoldPiece({ family, kind, name, back }: { family: FamilyId; kind: Kind; name: string; back: 'promote' | 'crest' }) {
  const c = FAMILIES[family].colors;
  const size = px(PIECE);
  return (
    <div className="pr-fold" style={{ width: `${FACE}mm`, height: `${FACE * 2}mm` }}>
      <div className="pr-half" style={{ transform: 'rotate(180deg)' }}>
        {back === 'promote' ? (
          <div style={{ position: 'relative', width: size, height: size }}>
            <PieceTile piece={make(family, kind, name, true)} family={family} variant="small" cell={size} />
          </div>
        ) : (
          <div className="pr-back" style={{ background: c.tile, borderColor: c.border }}>
            <Crest family={family} size={px(16)} />
            <span style={{ fontSize: '3.2mm', fontWeight: 800, color: c.border }}>{FAMILIES[family].name}</span>
          </div>
        )}
      </div>
      <div className="pr-fold-line" />
      <div className="pr-half">
        <div style={{ position: 'relative', width: size, height: size }}>
          <PieceTile piece={make(family, kind, name)} family={family} variant="small" cell={size} />
        </div>
      </div>
    </div>
  );
}

/** ひっさつわざ札。使ったら うらがえす */
function SkillCard({ family }: { family: FamilyId }) {
  const f = FAMILIES[family];
  return (
    <div className="pr-fold" style={{ width: `${FACE}mm`, height: `${FACE * 2}mm` }}>
      <div className="pr-half" style={{ transform: 'rotate(180deg)' }}>
        <div className="pr-card used">
          <span style={{ fontSize: '3mm', fontWeight: 800 }}>{f.skill.name}</span>
          <span style={{ fontSize: '5mm', fontWeight: 800 }}>つかった</span>
        </div>
      </div>
      <div className="pr-fold-line" />
      <div className="pr-half">
        <div className="pr-card" style={{ borderColor: f.colors.border }}>
          <span style={{ fontSize: '2.6mm', fontWeight: 800, color: '#8a5a00' }}>ひっさつわざ</span>
          <span style={{ fontSize: f.skill.name.length > 5 ? '3.2mm' : '3.8mm', fontWeight: 800, lineHeight: 1.15 }}>{f.skill.name}</span>
          <Crest family={family} size={px(9)} />
          <span style={{ fontSize: '2.6mm', fontWeight: 800 }}>まだ つかえる</span>
        </div>
      </div>
    </div>
  );
}

function BoardPage() {
  const rows = 4;
  const cols = 3;
  /** はじめの並び (先手から見て)。後手の駒の文字は逆さに書く */
  const start: Record<string, { label: string; gote: boolean }> = {
    '0,0': { label: '金', gote: true },
    '1,0': { label: '大将', gote: true },
    '2,0': { label: '銀', gote: true },
    '1,1': { label: '足軽', gote: true },
    '1,2': { label: '足軽', gote: false },
    '0,3': { label: '銀', gote: false },
    '1,3': { label: '大将', gote: false },
    '2,3': { label: '金', gote: false },
  };
  return (
    <section className="pr-page pr-landscape">
      <div className="pr-board-side">
        <div className="pr-zone-label" style={{ transform: 'rotate(180deg)' }}>
          後手の 陣 (先手の 大将は ここで トライ)
        </div>
        <div className="pr-board" style={{ gridTemplateColumns: `repeat(${cols}, ${CELL}mm)`, gridTemplateRows: `repeat(${rows}, ${CELL}mm)` }}>
          {Array.from({ length: rows * cols }, (_, i) => {
            const x = i % cols;
            const y = Math.floor(i / cols);
            const s = start[`${x},${y}`];
            return (
              <div key={i} className={`pr-cell${y === 0 || y === rows - 1 ? ' zone' : ''}`}>
                {s && (
                  <span className="pr-start" style={s.gote ? { transform: 'rotate(180deg)' } : undefined}>
                    {s.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="pr-zone-label">先手の 陣 (後手の 大将は ここで トライ)</div>
      </div>

      <div className="pr-rules">
        <h1 className="display">戦国将棋 あそびかた</h1>
        <p className="pr-sub">かんたん (3×4) ・ 2人で あそぶ ・ 駒は 1人 1家ぶん (各家のページを 印刷)</p>

        <h2>じゅんび</h2>
        <ul>
          <li>駒を 切って、まんなかの 点線で 折って はり合わせる (厚紙に はると 長もち)</li>
          <li>盤の うすい文字の とおりに 並べる。金・銀は、その家の 金の武将・銀の武将</li>
          <li>駒の 上 (頭) を あいての ほうに 向ける。向きで どちらの駒か わかる</li>
          <li>ひっさつわざ札は「まだ つかえる」を 上にして 手もとに 置く。じゃんけんで 先手を きめる</li>
        </ul>

        <h2>指しかた</h2>
        <ul>
          <li>1回に 1つ: 駒を 1マス うごかす か、もちごまを 1まい 打つ</li>
          <li>駒の まわりの 点の むきに 1マス うごける (大将=8方向、金=たて・よこ、銀=ななめ、足軽=前)</li>
          <li>あいての駒が いる マスに うごくと とれる。とった駒は 寝返って 自分の「もちごま」に なる (頭を あいてに 向けなおす)</li>
          <li>もちごまは、空いている マスなら どこにでも 打てる。ただし 足軽は あいての 一番奥の段には 打てない</li>
          <li>足軽が あいての 一番奥の段に 入ったら「出世」。うらがえすと、金色の 点の むきに うごける。とられたら おもてに もどす</li>
        </ul>

        <h2>ひっさつわざ</h2>
        <ul>
          <li>1局に 1かいだけ。自分の番に「つかう!」と 言って 使い、札を「つかった」に うらがえす</li>
          <li>中身は 家ごとに ちがう (各家の ページを 見てね)</li>
        </ul>

        <h2>かちかた</h2>
        <div className="pr-win">① あいての 大将を とったら かち</div>
        <div className="pr-win try">
          ② <b>トライ</b>: 自分の 大将が あいての 一番奥の段 (色のついた段) に 入って、つぎの あいての番で とられなければ かち
        </div>
        <p className="pr-note">おなじ 盤の形が 3かい でたら ひきわけ</p>
      </div>
    </section>
  );
}

function FamilyPage({ family }: { family: FamilyId }) {
  const f = FAMILIES[family];
  const c = f.colors;
  const pieces: { kind: Kind; name: string; role: string; move: string }[] = [
    { kind: 'K', name: f.lord, role: '大将', move: '8方向に 1マス。とられたら まけ' },
    { kind: 'G', name: f.gold[0], role: '金の武将', move: 'たて・よこに 1マス' },
    { kind: 'S', name: f.gold[1], role: '銀の武将', move: 'ななめに 1マス' },
    { kind: 'P', name: '足軽', role: '足軽', move: '前に 1マス。出世すると 金色の 点の むき (前・ななめ前・よこ・うしろ)' },
  ];
  const spareFoot = f.skill.type === 'spawn';
  return (
    <section className="pr-page pr-portrait">
      <header className="pr-head" style={{ borderColor: c.border, background: c.tile }}>
        <Crest family={family} size={px(22)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm', flex: '1 1 auto' }}>
          <span className="display" style={{ fontSize: '11mm', lineHeight: 1 }}>
            {f.name}
          </span>
          <span style={{ fontSize: '4mm', fontWeight: 800 }}>大将 {f.lord}</span>
        </div>
        <Chara kind="K" family={family} size={px(34)} />
      </header>

      <div className="pr-skill" style={{ borderColor: c.border }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3mm' }}>
          <span style={{ fontSize: '3.6mm', fontWeight: 800, color: '#8a5a00' }}>ひっさつわざ</span>
          <span className="display" style={{ fontSize: '7.5mm' }}>
            {f.skill.name}
          </span>
          <span style={{ fontSize: '3.6mm', fontWeight: 800, color: '#6b5a44' }}>「{f.skill.phrase}」</span>
        </div>
        <p style={{ margin: 0, fontSize: '4.2mm', fontWeight: 700, lineHeight: 1.6 }}>
          {f.skill.desc}
          {f.skill.smallNote ? ` ※${f.skill.smallNote}` : ''}
        </p>
        <p style={{ margin: 0, fontSize: '3.2mm', fontWeight: 700, color: '#6b5a44' }}>1局に 1かいだけ。使ったら ひっさつわざ札を「つかった」に うらがえす</p>
      </div>

      <div className="pr-howto">
        <span>✂ 太い線で 切る → まんなかの 点線で 山折り → はり合わせる</span>
      </div>

      <div className="pr-pieces">
        {pieces.map((p) => (
          <FoldPiece key={p.kind} family={family} kind={p.kind} name={p.name} back={p.kind === 'P' ? 'promote' : 'crest'} />
        ))}
      </div>

      <div className="pr-bottom">
        <SkillCard family={family} />
        {spareFoot && (
          <>
            <FoldPiece family={family} kind="P" name="足軽" back="promote" />
            <FoldPiece family={family} kind="P" name="足軽" back="promote" />
          </>
        )}
        <div className="pr-moves">
          <div style={{ fontSize: '4mm', fontWeight: 800, marginBottom: '1.5mm' }}>駒の うごき</div>
          {pieces.map((p) => (
            <div key={p.kind} className="pr-move">
              <b>
                {p.role}
                {p.kind !== 'P' ? ` (${p.name})` : ''}
              </b>
              <span>{p.move}</span>
            </div>
          ))}
          {spareFoot && <div className="pr-move-note">予備の 足軽 2まいは「一領具足」で 新しく 出す ときに 使う</div>}
        </div>
      </div>
    </section>
  );
}

export function PrintSheets() {
  const only = new URLSearchParams(window.location.search).get('print') as FamilyId | null;
  const ids = only && only in FAMILIES ? [only] : FAMILY_IDS;
  return (
    <div className="pr-root">
      <style>{PRINT_CSS}</style>
      {!only && <BoardPage />}
      {ids.map((id) => (
        <FamilyPage key={id} family={id} />
      ))}
    </div>
  );
}

const PRINT_CSS = `
html, body, #root { height: auto !important; overflow: visible !important; background: #fff !important; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@page landscape { size: A4 landscape; margin: 0; }
@page portrait { size: A4 portrait; margin: 0; }
.pr-root { color: #2b2b2b; }
.pr-page { box-sizing: border-box; overflow: hidden; break-after: page; background: #fff; }
.pr-landscape { page: landscape; width: 297mm; height: 210mm; padding: 10mm 12mm; display: flex; gap: 10mm; align-items: center; }
.pr-portrait { page: portrait; width: 210mm; height: 297mm; padding: 10mm 12mm; display: flex; flex-direction: column; gap: 4mm; }
@media screen { .pr-page { margin: 8mm auto; box-shadow: 0 0 0 1px #ccc; } body { background: #eee !important; } }

.pr-board-side { display: flex; flex-direction: column; align-items: center; gap: 2mm; flex: 0 0 auto; }
.pr-board { display: grid; gap: 0.6mm; background: #5f9e45; border: 4mm solid #5a8f3c; border-radius: 3mm; }
.pr-cell { background: #a8d98a; display: flex; align-items: center; justify-content: center; }
.pr-cell.zone { background: #ffe9a8; }
.pr-start { font-size: 6mm; font-weight: 800; color: rgba(40, 70, 30, 0.35); }
.pr-zone-label { font-size: 3.4mm; font-weight: 800; color: #6b5a2a; }

.pr-rules { flex: 1 1 auto; font-size: 3.5mm; font-weight: 700; line-height: 1.55; }
.pr-rules h1 { margin: 0; font-size: 9mm; font-weight: 400; }
.pr-sub { margin: 1mm 0 2mm; color: #6b5a44; font-size: 3.3mm; }
.pr-rules h2 { margin: 2.6mm 0 1mm; font-size: 4.4mm; font-weight: 800; color: #fff; background: #6b3fa0; display: inline-block; padding: 0.4mm 3mm; border-radius: 3mm; }
.pr-rules ul { margin: 0; padding-left: 5mm; }
.pr-rules li { margin: 0.4mm 0; }
.pr-win { background: #f5efe3; border-radius: 3mm; padding: 1.2mm 3mm; margin: 1mm 0; }
.pr-win.try { background: #fff1c9; }
.pr-win b { color: #b5452a; }
.pr-note { margin: 1mm 0 0; color: #6b5a44; }

.pr-head { display: flex; align-items: center; gap: 5mm; border: 1.2mm solid; border-radius: 5mm; padding: 2mm 6mm; }
.pr-skill { border: 0.8mm solid; border-radius: 4mm; padding: 3mm 5mm; display: flex; flex-direction: column; gap: 1.5mm; background: #fffaf0; }
.pr-howto { font-size: 3.4mm; font-weight: 800; color: #6b5a44; }
.pr-pieces { display: flex; gap: 6mm; justify-content: center; }
.pr-bottom { display: flex; gap: 6mm; justify-content: center; align-items: flex-start; }
.pr-fold { border: 0.5mm solid #333; display: flex; flex-direction: column; flex: 0 0 auto; background: #fff; }
.pr-half { flex: 1 1 0; display: flex; align-items: center; justify-content: center; }
.pr-fold-line { border-top: 0.4mm dashed #888; }
.pr-back { width: 34mm; height: 34mm; border: 0.8mm solid; border-radius: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; }
.pr-card { width: 34mm; height: 34mm; border: 0.8mm solid; border-radius: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm; text-align: center; background: #fff7e0; }
.pr-card.used { border-color: #999; background: #e6e6e6; color: #555; }
.pr-moves { flex: 1 1 auto; max-width: 90mm; font-size: 3.4mm; font-weight: 700; line-height: 1.5; border: 0.4mm solid #ddd; border-radius: 3mm; padding: 3mm 4mm; }
.pr-move { display: flex; flex-direction: column; margin-bottom: 1.2mm; }
.pr-move b { font-weight: 800; }
.pr-move-note { margin-top: 1mm; color: #8a5a00; }
.pr-root .tile { transition: none; }
`;
