import type React from 'react';
import { FAMILIES, type FamilyId } from '../data/families';
import { directions } from '../engine/game';
import type { Piece, Variant } from '../engine/types';
import { Chara, specialOf } from './Chara';
import { Crest } from './FamilyInfo';

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
  justPromoted?: boolean;
  /** 動いた・打たれたときの動き */
  motion?: Motion;
}

/**
 * 駒の動き。fx, fy は「動く前の場所」から今のマスまでのずれ (px)
 * slide=すべる / battle=すべって ぶつかってから入る / drop=上から置かれる
 */
export interface Motion {
  key: number;
  kind: 'slide' | 'battle' | 'drop';
  fx: number;
  fy: number;
}

/** 盤上の駒。家の色の枠、胸から上のキャラ、武将名、動ける方向の三角 */
export function PieceTile({ piece, family, variant, cell, selected, target, shooter, shielded, justPromoted, motion }: Props) {
  const c = FAMILIES[family].colors;
  /** 大将は金色のタイルに、家紋つきの「大将」のたすきをかけて、ひと目でわかるようにする */
  const isLord = piece.kind === 'K';
  /** マスが小さいとき (スマホの 5×6) は名前を出さず、絵を大きくする。名前は選んだときに盤の下の案内に出る */
  const showName = cell >= 80 && !isLord;
  const sashH = Math.round(Math.max(15, cell * 0.19));
  const cls = [
    'tile',
    selected && 'selected',
    target && 'target',
    shooter && 'shooter',
    shielded && 'shielded',
    piece.promoted && 'promoted',
    justPromoted && 'just-promoted',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      key={motion?.key}
      className={`piece-wrap${motion ? ` motion-${motion.kind}` : ''}`}
      style={motion ? ({ '--fx': `${motion.fx}px`, '--fy': `${motion.fy}px` } as React.CSSProperties) : undefined}
    >
      <div
        className={`${cls}${isLord ? ' lord' : ''}`}
        style={{
          background: isLord ? '#FFE38A' : c.tile,
          borderColor: c.border,
          borderWidth: isLord ? 4 : undefined,
          width: cell - 12,
          height: cell - 12,
          paddingBottom: isLord ? sashH * 0.7 : undefined,
        }}
      >
        <Chara
          kind={piece.kind}
          family={family}
          crop="bust"
          size={Math.round(cell * (isLord ? 0.58 : showName ? 0.62 : 0.76))}
          special={specialOf(piece.name, piece.originFamily)}
        />
        {showName && (
          <span className="tile-name" style={{ fontSize: cell > 110 ? 15 : cell >= 90 ? 13 : 12 }}>
            {piece.name}
          </span>
        )}
        {isLord && (
          <span className="lord-sash" style={{ height: sashH, fontSize: Math.round(sashH * 0.68), borderRadius: sashH / 2 }}>
            <Crest family={family} size={sashH - 2} />
            大将
          </span>
        )}
        {piece.promoted && <span className="rank-badge">{piece.kind === 'P' ? '出世' : '武勲'}</span>}
      </div>
      <DirArrows box={cell} half={(cell - 12) / 2} dirs={directions(piece, variant)} color={piece.promoted ? '#C98A00' : c.border} />
    </div>
  );
}

interface ArrowProps {
  /** 三角を並べる正方形の一辺 (この中心が駒の中心) */
  box: number;
  /** 駒のタイルの一辺の半分。三角はタイルのふちに置く */
  half: number;
  dirs: [number, number][];
  color: string;
  /** 親の枠線のぶん位置をずらす (px) */
  offset?: number;
}

/** 駒の動ける方向を、タイルのふちの三角 (矢じり) で示す */
export function DirArrows({ box, half, dirs, color, offset = 0 }: ArrowProps) {
  const s = half / 42;
  return (
    <svg className="dir-arrows" width={box} height={box} aria-hidden="true" style={offset ? { left: -offset, top: -offset } : undefined}>
      {dirs.map(([dx, dy]) => {
        const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
        // ななめは角が丸いぶん、少し外側に置く
        const edge = dx !== 0 && dy !== 0 ? half * 1.24 : half;
        return (
          <path
            key={`${dx},${dy}`}
            d={`M0 ${-edge - 11 * s} L${-7 * s} ${-edge + s} L${7 * s} ${-edge + s} Z`}
            transform={`translate(${box / 2} ${box / 2}) rotate(${deg})`}
            fill={color}
            stroke="#fff"
            strokeWidth={Math.max(1.5, 2 * s)}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
