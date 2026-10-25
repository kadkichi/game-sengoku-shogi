import { FAMILIES, type FamilyId } from '../data/families';
import { directions } from '../engine/game';
import type { Piece, Variant } from '../engine/types';
import { Chara, specialOf } from './Chara';

interface Props {
  piece: Piece;
  family: FamilyId;
  variant: Variant;
  /** マスの一辺 (px) */
  cell: number;
  selected?: boolean;
  target?: boolean;
  shooter?: boolean;
  /** 小田原城で守られている */
  shielded?: boolean;
  justMoved?: boolean;
  justPromoted?: boolean;
}

/** 盤上の駒。家の色の枠、胸から上のキャラ、武将名、動ける方向の点 */
export function PieceTile({ piece, family, variant, cell, selected, target, shooter, shielded, justMoved, justPromoted }: Props) {
  const c = FAMILIES[family].colors;
  const cls = [
    'tile',
    selected && 'selected',
    target && 'target',
    shooter && 'shooter',
    shielded && 'shielded',
    piece.promoted && 'promoted',
    justMoved && 'just-moved',
    justPromoted && 'just-promoted',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <div className={cls} style={{ background: c.tile, borderColor: c.border, width: cell - 12, height: cell - 12 }}>
        <Chara kind={piece.kind} family={family} crop="bust" size={Math.round(cell * 0.62)} special={specialOf(piece.name, piece.originFamily)} />
        <span className="tile-name" style={{ fontSize: cell > 110 ? 15 : 12 }}>
          {piece.name}
        </span>
        {piece.promoted && <span className="rank-badge">{piece.kind === 'P' ? '出世' : '武勲'}</span>}
      </div>
      {directions(piece, variant).map(([dx, dy]) => (
        <span
          key={`${dx},${dy}`}
          className="dir-dot"
          style={{ left: cell / 2 + dx * (cell / 2 - 6) - 6, top: cell / 2 + dy * (cell / 2 - 6) - 6, background: piece.promoted ? '#C98A00' : c.border }}
        />
      ))}
    </>
  );
}
