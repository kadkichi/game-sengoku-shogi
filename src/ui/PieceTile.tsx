import type React from 'react';
import { FAMILIES, type FamilyId } from '../data/families';
import { directions } from '../engine/game';
import type { Piece, Variant } from '../engine/types';
import { Chara, specialOf } from './Chara';
import { Crest } from './FamilyInfo';
import { tileColors } from './sideColors';

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

/** 盤上の駒。家の色の枠、胸から上のキャラ、武将名、動ける方向の点 */
export function PieceTile({ piece, family, variant, cell, selected, target, shooter, shielded, justPromoted, motion }: Props) {
  const c = FAMILIES[family].colors;
  /** 大将は金色のタイルと金色の縁取り、右上に家紋、下に名前のたすきで、ひと目でわかるようにする */
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
          ...tileColors(family, piece.owner, isLord),
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
          <>
            <span className="lord-crest" style={{ width: Math.round(cell * 0.24), height: Math.round(cell * 0.24) }}>
              <Crest family={family} size={Math.round(cell * 0.24)} />
            </span>
            <span
              className="lord-sash"
              style={{
                height: sashH,
                // 名前が長くても、たすきが駒の幅から大きくはみ出さないように文字を小さくする
                fontSize: Math.max(8, Math.min(Math.round(sashH * 0.68), Math.floor((cell - 32) / piece.name.length))),
                borderRadius: sashH / 2,
              }}
            >
              {piece.name}
            </span>
          </>
        )}
        {piece.promoted && <span className="rank-badge">{piece.kind === 'P' ? '出世' : '武勲'}</span>}
      </div>
      <DirDots box={cell} half={(cell - 12) / 2} dirs={directions(piece, variant)} color={piece.promoted ? '#C98A00' : c.border} />
    </div>
  );
}

interface DotProps {
  /** 点を並べる正方形の一辺 (この中心が駒の中心) */
  box: number;
  /** 駒のタイルの一辺の半分。点はタイルのふちに置く */
  half: number;
  dirs: [number, number][];
  color: string;
  /** 親の枠線のぶん位置をずらす (px) */
  offset?: number;
}

/** 駒の動ける方向を、タイルのふちの点で示す */
export function DirDots({ box, half, dirs, color, offset = 0 }: DotProps) {
  const r = Math.max(4, (6 * half) / 42);
  return (
    <svg className="dir-arrows" width={box} height={box} aria-hidden="true" style={offset ? { left: -offset, top: -offset } : undefined}>
      {dirs.map(([dx, dy]) => (
        <circle
          key={`${dx},${dy}`}
          cx={box / 2 + dx * half}
          cy={box / 2 + dy * half}
          r={r}
          fill={color}
          stroke="#fff"
          strokeWidth={Math.max(1.5, (2 * half) / 42)}
        />
      ))}
    </svg>
  );
}
