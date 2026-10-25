import type { FamilyId } from './families';

/** 大名選択の地図の大きさ (px)。SVG の座標もこの大きさ */
export const MAP_W = 848;
export const MAP_H = 700;

/** デフォルメした日本の島 (SVG パス) */
export const ISLANDS = {
  honshu:
    'M150 430 L200 395 L290 365 L380 345 L440 300 L470 250 L455 215 L495 215 L540 245 L585 215 L625 160 L650 100 L690 50 L735 58 L742 110 L728 175 L712 240 L735 300 L700 330 L665 345 L645 390 L615 375 L575 395 L530 400 L490 420 L470 470 L425 480 L400 440 L365 415 L310 420 L250 440 L190 455 Z',
  shikoku: 'M240 470 L355 462 L370 500 L330 535 L285 528 L240 510 Z',
  kyushu: 'M90 460 L165 450 L190 500 L180 580 L140 630 L95 610 L75 540 Z',
  hokkaido: 'M705 -10 L860 -10 L860 38 L800 46 L748 28 Z',
};

/**
 * 各家の本拠地 (home) と、顔アイコンを置く場所 (icon)。
 * 中部地方は家が集まっているので、アイコンは海の上に置いて点線でつなぐ
 */
export const MAP_POINTS: Record<FamilyId, { place: string; home: [number, number]; icon: [number, number] }> = {
  date: { place: '米沢', home: [705, 190], icon: [790, 250] },
  uesugi: { place: '越後', home: [585, 235], icon: [585, 110] },
  sanada: { place: '信濃 上田', home: [545, 305], icon: [395, 230] },
  takeda: { place: '甲斐', home: [580, 345], icon: [485, 150] },
  hojo: { place: '相模 小田原', home: [640, 365], icon: [780, 390] },
  imagawa: { place: '駿河', home: [590, 385], icon: [690, 470] },
  tokugawa: { place: '三河', home: [535, 398], icon: [590, 545] },
  oda: { place: '尾張', home: [490, 395], icon: [490, 600] },
  toyotomi: { place: '大坂', home: [380, 412], icon: [400, 610] },
  mori: { place: '安芸', home: [245, 410], icon: [215, 310] },
  chosokabe: { place: '土佐', home: [305, 512], icon: [300, 615] },
  shimazu: { place: '薩摩', home: [135, 595], icon: [215, 625] },
};
