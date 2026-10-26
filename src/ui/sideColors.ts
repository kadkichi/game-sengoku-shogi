import { FAMILIES, type FamilyId } from '../data/families';
import type { Side } from '../engine/types';

/** 色を白に近づける。k=1 で元の色、k=0 で白 */
const toWhite = (hex: string, k: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k + 255 * (1 - k)).toString(16).padStart(2, '0'))
    .join('');

const SENTE_TILE = '#FFFDF7';
const LORD_TILE = '#FFE38A';
const LORD_BORDER_SENTE = '#B8860B';

/**
 * 駒のタイルの背景と枠の色。家の色が近い組み合わせでも見分けられるように、
 * 先手は白に近い背景、後手は家の色を中くらいに薄めた背景にする。
 * 大将はどちらも金色で、後手だけ枠を家の色にする。
 */
export function tileColors(family: FamilyId, side: Side, isLord = false): { background: string; borderColor: string } {
  const border = FAMILIES[family].colors.border;
  if (isLord) return { background: LORD_TILE, borderColor: side === 'sente' ? LORD_BORDER_SENTE : border };
  return { background: side === 'sente' ? SENTE_TILE : toWhite(border, 0.4), borderColor: border };
}
