import type { ClanId } from './families';

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
 * 中部・近畿は家が集まっているので、アイコンは 北の列 (日本海側) と 南の列 (太平洋側) に
 * 西から東へ並べて、本拠地と点線でつなぐ。アイコンは陸に少しかかってもよい
 */
export const MAP_POINTS: Record<ClanId, { place: string; home: [number, number]; icon: [number, number] }> = {
  // 北の列 (西から)
  mori: { place: '安芸', home: [245, 410], icon: [185, 335] },
  honganji: { place: '摂津 石山', home: [372, 400], icon: [265, 278] },
  ashikaga: { place: '山城 京都', home: [405, 382], icon: [345, 238] },
  asai: { place: '近江 小谷', home: [440, 360], icon: [422, 182] },
  saito: { place: '美濃 稲葉山', home: [478, 378], icon: [502, 140] },
  sanada: { place: '信濃 上田', home: [545, 305], icon: [585, 118] },
  uesugi: { place: '越後', home: [585, 235], icon: [672, 168] },
  date: { place: '米沢', home: [705, 190], icon: [790, 238] },
  // 東と南の列 (東から)
  takeda: { place: '甲斐', home: [580, 345], icon: [655, 278] },
  hojo: { place: '相模 小田原', home: [640, 365], icon: [785, 365] },
  imagawa: { place: '駿河', home: [590, 385], icon: [705, 462] },
  tokugawa: { place: '三河', home: [535, 398], icon: [610, 535] },
  oda: { place: '尾張', home: [500, 398], icon: [512, 585] },
  toyotomi: { place: '大坂', home: [380, 412], icon: [412, 600] },
  chosokabe: { place: '土佐', home: [305, 512], icon: [312, 628] },
  shimazu: { place: '薩摩', home: [135, 595], icon: [212, 640] },
};
