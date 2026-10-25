import { memo } from 'react';
import { FAMILIES, type FamilyId } from '../data/families';
import type { Kind } from '../engine/types';

const D = '#3A1F14';
const GOLD = '#F5C033';
const SILVER = '#D5DEE6';
const WOOD = '#8A5A2B';
const RED = '#D9302C';

const circle = (x: number, y: number, r: number) => `M${x} ${y - r} a${r} ${r} 0 1 0 0.01 0 Z`;
/** 中抜きの輪 (外は時計回りと逆、内は時計回りで描いて穴をあける) */
const ring = (r: number, w: number) => `M0 ${-r} a${r} ${r} 0 1 0 0.01 0 Z M0 ${-(r - w)} a${r - w} ${r - w} 0 1 1 -0.01 0 Z`;
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number) =>
  `${(cx + r * Math.sin(rad(deg))).toFixed(1)} ${(cy - r * Math.cos(rad(deg))).toFixed(1)}`;

/** 家紋 (原点中心、半径およそ7) */
export const MON: Record<FamilyId, string> = {
  oda: 'M0 -7.6 a3.6 3.6 0 1 0 0.01 0 Z M4 -3.6 a3.6 3.6 0 1 0 0.01 0 Z M0 0.4 a3.6 3.6 0 1 0 0.01 0 Z M-4 -3.6 a3.6 3.6 0 1 0 0.01 0 Z',
  takeda:
    'M0 -7 L3.2 -3.8 L0 -0.6 L-3.2 -3.8 Z M-3.8 -3.2 L-0.6 0 L-3.8 3.2 L-7 0 Z M3.8 -3.2 L7 0 L3.8 3.2 L0.6 0 Z M0 0.6 L3.2 3.8 L0 7 L-3.2 3.8 Z',
  uesugi: 'M0 7 C-6 2 -6 -4 -1 -8 C0 -2 1 2 0 7 Z M0 7 C6 2 6 -4 1 -8 C0 -2 -1 2 0 7 Z',
  // 五七桐 (簡略): 3枚の葉と、上に3つの花
  toyotomi:
    'M-7.5 5 Q-8 -1 -3 0 Q-3.5 4.5 -7.5 5 Z M7.5 5 Q8 -1 3 0 Q3.5 4.5 7.5 5 Z M-2.4 7 Q-3.5 -1 0 -1.5 Q3.5 -1 2.4 7 Z ' +
    `${circle(-4.5, -4.5, 1.8)} ${circle(0, -6, 1.8)} ${circle(4.5, -4.5, 1.8)}`,
  // 三つ葉葵 (簡略): 輪の中に3枚の葉
  tokugawa: `${ring(7.6, 1.4)} ${circle(0, -2.8, 2.6)} ${circle(2.6, 1.8, 2.6)} ${circle(-2.6, 1.8, 2.6)}`,
  // 一文字に三つ星
  mori: `M-7 -6.5 L7 -6.5 L7 -4 L-7 -4 Z ${circle(0, 0, 2.4)} ${circle(-3.8, 4.4, 2.4)} ${circle(3.8, 4.4, 2.4)}`,
  // 三つ鱗
  hojo: 'M0 -7 L4 0 L-4 0 Z M-4 0.6 L0 7.4 L-8 7.4 Z M4 0.6 L8 7.4 L0 7.4 Z',
  // 足利二つ引両
  imagawa: `${ring(7.6, 1.4)} M-5.6 -3 L5.6 -3 L5.6 -0.6 L-5.6 -0.6 Z M-5.6 1.2 L5.6 1.2 L5.6 3.6 L-5.6 3.6 Z`,
  // 九曜 (伊達家の替紋)
  date: [circle(0, 0, 2.3), ...[0, 45, 90, 135, 180, 225, 270, 315].map((a) => circle(5.2 * Math.sin(rad(a)), -5.2 * Math.cos(rad(a)), 1.7))].join(' '),
  // 丸に十字
  shimazu: `${ring(7.6, 1.4)} M-1.1 -6 L1.1 -6 L1.1 6 L-1.1 6 Z M-6 -1.1 L6 -1.1 L6 1.1 L-6 1.1 Z`,
  // 七つ片喰 (簡略): 3枚のハート形の葉
  chosokabe: [0, 120, 240]
    .map((a) => `M0 0 L${pt(0, 0, 7, a - 32)} Q${pt(0, 0, 8.5, a)} ${pt(0, 0, 4.6, a)} Q${pt(0, 0, 8.5, a)} ${pt(0, 0, 7, a + 32)} Z`)
    .join(' '),
  // 六文銭
  sanada: [-5, 0, 5].flatMap((x) => [circle(x, -2.6, 2.1), circle(x, 2.6, 2.1)]).join(' '),
};

const tr = (x: number, y: number, s: number) => `translate(${x} ${y}) scale(${s})`;
const HIDE = 'scale(0)';

const KABUTO = 'M78 84 C78 50 162 50 162 84 Z';
const BAND = 'M74 78 L166 78 Q171 78 171 84 Q171 90 166 90 L74 90 Q69 90 69 84 Q69 78 74 78 Z';
const FLAPS = 'M72 86 L54 80 L56 112 L76 108 Z M168 86 L186 80 L184 112 L164 108 Z';
const TRIM = 'M88 146 L76 208 M152 146 L164 208';
const SHINGEN_BEARD = 'M88 102 C86 132 108 142 120 138 C132 142 154 132 152 102 C146 118 136 124 120 124 C104 124 94 118 88 102 Z';
const SHINGEN_STACHE = 'M106 117 C110 111 118 113 120 116 C122 113 130 111 134 117 C128 120 124 119 120 118 C116 119 112 120 106 117 Z';
const CHIN_BEARD = 'M100 121 C104 133 136 133 140 121 C132 127 108 127 100 121 Z';
const THIN_STACHE = 'M107 115 C112 111 117 112 120 114.5 C123 112 128 111 133 115';
const FLAG = 'M60 22 L20 22 L20 84 L60 84 Z';
const YARI = { wLine: 'M62 150 L62 18', wLineColor: WOOD, wLineW: 5, wA: 'M62 0 L68 16 L62 24 L56 16 Z', wAFill: SILVER };
const KATANA = { wLine: 'M62 116 L63 134', wLineColor: D, wLineW: 7, wA: 'M58 108 L50 28 Q52 22 57 24 L66 108 Z', wAFill: SILVER, wB: 'M52 112 a10 4 0 1 0 20 0 a10 4 0 1 0 -20 0 Z', wBFill: GOLD };

/** 豊臣秀吉の 馬藺後立 (放射状の金の飾り) */
const SUNBURST = [-72, -54, -36, -18, 0, 18, 36, 54, 72]
  .map((a) => `M${pt(120, 56, 16, a - 7)} L${pt(120, 56, 60, a)} L${pt(120, 56, 16, a + 7)} Z`)
  .join(' ');

interface Parts {
  backA: string; backFill: string; backLines: string; backMonT: string; horns: string;
  wLine: string; wLineColor: string; wLineW: number; wA: string; wAFill: string; wB: string; wBFill: string;
  wMonT: string; wMonFill: string; flagText: string; wC: string; wCFill: string; trim: string; plates: string;
  mons: string[]; beard: string; beardFill: string; stache: string; stacheFill: string; stacheLine: string;
  helmA: string; helmFill: string; band: string; flaps: string; flapL: string; flapR: string;
  frontA: string; frontAFill: string; frontB: string; frontMonT: string; hatMonT: string; brows: string;
  patch: boolean;
  /** 前立ての文字 (直江兼続の「愛」) */
  frontText: string;
}

export type CharaSpecial = 'yukimura' | 'kanetsugu';

function parts(kind: Kind, fam: FamilyId, special?: CharaSpecial): Parts {
  const C = FAMILIES[fam].colors;
  const v: Parts = {
    backA: '', backFill: '#FFFFFF', backLines: '', backMonT: HIDE, horns: '',
    wLine: '', wLineColor: D, wLineW: 5, wA: '', wAFill: SILVER, wB: '', wBFill: D, wMonT: HIDE, wMonFill: GOLD,
    flagText: '', wC: '', wCFill: RED, trim: '', plates: '', mons: [],
    beard: '', beardFill: '#FFFFFF', stache: '', stacheFill: '#FFFFFF', stacheLine: '',
    helmA: KABUTO, helmFill: C.helm, band: BAND, flaps: FLAPS, flapL: HIDE, flapR: HIDE,
    frontA: '', frontAFill: GOLD, frontB: '', frontMonT: HIDE, hatMonT: HIDE,
    brows: 'M96 93 L112 97 M144 93 L128 97', patch: false, frontText: '',
  };
  const lordFront = () => {
    v.frontA = circle(120, 64, 15);
    v.frontB = circle(120, 64, 10.5);
    v.frontMonT = tr(120, 64, 0.9);
  };
  const flapMons = () => {
    v.flapL = tr(65, 96, 1);
    v.flapR = tr(175, 96, 1);
  };
  const flag = (fill: string, monFill: string) => {
    v.wLine = 'M62 150 L62 18';
    v.wLineColor = WOOD;
    v.wA = FLAG;
    v.wAFill = fill;
    v.wMonT = tr(40, 53, 2);
    v.wMonFill = monFill;
  };

  if (kind === 'K') {
    v.trim = TRIM;
    v.mons = [tr(100, 166, 1), tr(142, 166, 1), tr(96, 200, 1), tr(146, 200, 1)];
    switch (fam) {
      case 'oda':
        v.backA = 'M70 140 C58 170 54 200 58 228 L182 228 C186 200 182 170 170 140 Z';
        v.backFill = RED;
        v.horns = 'M84 66 C60 64 44 50 40 30 C56 44 72 50 98 52 Z M156 66 C180 64 196 50 200 30 C184 44 168 50 142 52 Z';
        v.wLine = 'M63 26 L63 120';
        v.wLineW = 7;
        v.wA = 'M57 118 L69 118 L76 152 L52 152 Z';
        v.wAFill = WOOD;
        v.wB = 'M59 40 L67 40 L67 46 L59 46 Z M59 70 L67 70 L67 76 L59 76 Z';
        v.wBFill = GOLD;
        v.stacheLine = `${THIN_STACHE} M120 124 L120 129`;
        v.brows = 'M95 91 L112 98 M145 91 L128 98';
        flapMons();
        lordFront();
        break;
      case 'takeda':
        v.backA =
          'M40 150 C18 128 26 78 58 62 C66 34 98 20 120 28 C142 20 174 34 182 62 C214 78 222 128 200 150 C190 140 182 150 176 160 L64 160 C58 150 50 140 40 150 Z';
        v.backLines = 'M54 120 L44 128 M190 116 L200 126 M60 84 L50 80 M182 84 L192 80';
        v.horns = 'M90 64 C70 52 60 30 70 6 C76 30 90 44 106 52 Z M150 64 C170 52 180 30 170 6 C164 30 150 44 134 52 Z';
        v.wLine = 'M62 132 L62 40';
        v.wA = 'M62 30 C40 28 30 44 36 58 C30 72 42 88 62 86 C82 88 94 72 88 58 C94 44 84 28 62 30 Z';
        v.wAFill = GOLD;
        v.wB = 'M62 36 C46 35 39 46 43 58 C39 70 47 81 62 80 C77 81 85 70 81 58 C85 46 78 35 62 36 Z';
        v.wBFill = '#2B1A12';
        v.wMonT = tr(62, 58, 1);
        v.wC = 'M58 122 L66 122 L74 168 L50 168 Z';
        v.beard = SHINGEN_BEARD;
        v.stache = SHINGEN_STACHE;
        flapMons();
        lordFront();
        break;
      case 'uesugi':
        v.wLine = 'M62 150 L62 18';
        v.wLineColor = WOOD;
        v.wA = FLAG;
        v.wAFill = '#FFFFFF';
        v.flagText = '毘';
        v.helmA = 'M76 138 C66 100 74 52 120 48 C166 52 174 100 164 138 L152 136 C156 112 152 88 120 84 C88 88 84 112 88 136 Z';
        v.helmFill = '#FFFFFF';
        v.band = '';
        v.flaps = '';
        v.brows = 'M97 94 Q104 91 112 94 M143 94 Q136 91 128 94';
        break;
      case 'toyotomi':
        v.backA = SUNBURST;
        v.backFill = GOLD;
        v.wLine = 'M62 150 L62 34';
        v.wLineColor = WOOD;
        // 千成瓢箪
        v.wA = `${circle(62, 14, 7)} ${circle(62, 28, 10)}`;
        v.wAFill = GOLD;
        v.wC = 'M56 22 L68 22 L68 25 L56 25 Z';
        v.stacheLine = THIN_STACHE;
        v.brows = 'M97 92 Q104 89 111 93 M143 92 Q136 89 129 93';
        lordFront();
        break;
      case 'tokugawa':
        // 歯朶 (シダ) の前立て
        v.horns = 'M120 66 C102 54 96 26 120 0 C144 26 138 54 120 66 Z';
        v.backLines = 'M120 60 L120 8 M120 22 L110 14 M120 22 L130 14 M120 36 L106 28 M120 36 L134 28 M120 50 L108 42 M120 50 L132 42';
        // 采配
        v.wLine = 'M62 132 L62 62';
        v.wA = 'M62 64 L42 32 L50 28 L60 54 L62 22 L68 24 L65 54 L80 30 L86 35 L64 64 Z';
        v.wAFill = '#FFFFFF';
        v.beard = CHIN_BEARD;
        v.beardFill = '#2B1A12';
        v.brows = 'M97 94 Q104 91 112 94 M143 94 Q136 91 128 94';
        lordFront();
        v.frontMonT = tr(120, 64, 0.9);
        break;
      case 'mori':
        // 三本の矢
        v.wLine = 'M55 150 L55 22 M62 150 L62 18 M69 150 L69 22';
        v.wLineColor = WOOD;
        v.wLineW = 3.5;
        v.wA = 'M55 10 L59.5 23 L50.5 23 Z M62 6 L66.5 19 L57.5 19 Z M69 10 L73.5 23 L64.5 23 Z';
        v.wB = 'M51 138 L55 148 L59 138 L55 130 Z M58 138 L62 148 L66 138 L62 130 Z M65 138 L69 148 L73 138 L69 130 Z';
        v.wBFill = '#FFFFFF';
        v.beard = CHIN_BEARD;
        v.beardFill = '#FFFFFF';
        v.brows = 'M97 94 Q104 91 112 94 M143 94 Q136 91 128 94';
        lordFront();
        break;
      case 'hojo':
        flag(C.main, '#FFFFFF');
        v.brows = 'M96 93 L112 96 M144 93 L128 96';
        lordFront();
        break;
      case 'imagawa':
        // 公家風の烏帽子と扇
        v.helmA = 'M92 84 Q88 40 106 22 Q124 8 142 26 Q154 48 148 84 Z';
        v.helmFill = '#2B2B2B';
        v.band = '';
        v.flaps = '';
        v.wA = 'M63 112 L32 70 Q63 46 94 70 Z';
        v.wAFill = GOLD;
        v.wB = 'M63 112 L44 62 M63 112 L63 56 M63 112 L82 62';
        v.wBFill = 'none';
        v.brows = 'M102 90 L106 90 M134 90 L138 90';
        break;
      case 'date':
        // 大きな金の三日月と眼帯
        v.frontA = 'M58 50 C82 84 158 84 182 50 C156 72 84 72 58 50 Z';
        v.wLine = KATANA.wLine;
        v.wLineW = KATANA.wLineW;
        v.wA = KATANA.wA;
        v.wB = KATANA.wB;
        v.wBFill = GOLD;
        v.brows = 'M95 91 L112 97 M145 91 L128 97';
        v.patch = true;
        break;
      case 'shimazu':
        Object.assign(v, YARI);
        v.wA = 'M62 0 L67 14 L74 12 L74 18 L67 17 L62 26 L57 17 L50 18 L50 12 L57 14 Z';
        v.beard = SHINGEN_BEARD;
        v.beardFill = '#2B1A12';
        v.stache = SHINGEN_STACHE;
        v.stacheFill = '#2B1A12';
        v.brows = 'M94 90 L113 98 M146 90 L127 98';
        lordFront();
        break;
      case 'chosokabe':
        // 一領具足: 槍に鍬をくくりつける
        v.wLine = 'M62 150 L62 18';
        v.wLineColor = WOOD;
        v.wA = 'M46 14 L78 14 L76 28 L48 28 Z';
        v.wAFill = SILVER;
        v.brows = 'M97 94 Q104 91 112 94 M143 94 Q136 91 128 94';
        lordFront();
        break;
      case 'sanada':
        flag(C.main, GOLD);
        v.beard = CHIN_BEARD;
        v.beardFill = '#2B1A12';
        v.stacheLine = THIN_STACHE;
        lordFront();
        break;
    }
  } else if (kind === 'G') {
    v.trim = TRIM;
    v.mons = [tr(100, 168, 1), tr(140, 168, 1)];
    v.horns = 'M98 62 C88 52 86 40 90 30 C94 42 100 50 110 54 Z M142 62 C152 52 154 40 150 30 C146 42 140 50 130 54 Z';
    Object.assign(v, YARI);
    v.frontA = circle(120, 68, 10);
    v.frontB = circle(120, 68, 6.5);
    v.frontMonT = tr(120, 68, 0.55);
    v.beard = CHIN_BEARD;
    v.beardFill = '#2B1A12';
    if (special === 'yukimura') {
      // 真田幸村: 鹿の角の前立てと十文字槍
      v.horns =
        'M104 56 L90 34 L80 32 L84 28 L91 31 L88 16 L94 18 L95 32 L106 52 Z M136 56 L150 34 L160 32 L156 28 L149 31 L152 16 L146 18 L145 32 L134 52 Z';
      v.wA = 'M62 0 L67 14 L74 12 L74 18 L67 17 L62 26 L57 17 L50 18 L50 12 L57 14 Z';
      v.beard = '';
      v.brows = 'M95 91 L112 97 M145 91 L128 97';
    }
  } else if (kind === 'S') {
    v.trim = TRIM;
    v.mons = [tr(100, 168, 1), tr(140, 168, 1)];
    Object.assign(v, KATANA);
    v.frontA = 'M98 60 C102 46 112 40 120 40 C128 40 138 46 142 60 C136 52 128 48 120 48 C112 48 104 52 98 60 Z';
    v.frontAFill = SILVER;
    v.brows = 'M97 95 L111 96 M143 95 L129 96';
  } else {
    v.backA = 'M166 26 L170 26 L170 150 L166 150 Z M170 30 L204 30 L204 78 L170 78 Z';
    v.backFill = C.main;
    v.backMonT = tr(187, 54, 1.5);
    Object.assign(v, YARI);
    v.helmA = 'M56 88 L120 50 L184 88 Q120 100 56 88 Z';
    v.helmFill = C.main;
    v.band = '';
    v.flaps = '';
    v.hatMonT = tr(120, 75, 1.3);
    v.plates = 'M88 160 L152 160 M86 172 L154 172 M84 200 L156 200';
    v.brows = 'M98 98 Q104 95 111 98 M142 98 Q136 95 129 98';
  }
  if (special === 'kanetsugu' && (kind === 'G' || kind === 'S')) {
    // 直江兼続: 黒い兜に、瑞雲 (めでたい雲) に乗った「愛」の前立て。金でも銀でも同じ見た目
    v.horns = '';
    v.helmFill = '#2B2B3A';
    v.frontA = 'M90 64 Q83 56 94 52 Q96 45 106 47 Q113 41 120 46 Q127 41 134 47 Q144 45 146 52 Q157 56 150 64 Z';
    v.frontAFill = GOLD;
    v.frontB = '';
    v.frontMonT = HIDE;
    v.frontText = '愛';
    v.beard = '';
    v.brows = 'M97 94 Q104 91 112 94 M143 94 Q136 91 128 94';
  }
  return v;
}

export interface CharaProps {
  kind: Kind;
  family: FamilyId;
  crop?: 'full' | 'bust';
  mood?: 'normal' | 'happy';
  size: number;
  title?: string;
  /** 特別な見た目の武将 (真田幸村・直江兼続) */
  special?: CharaSpecial;
}

/** 武将名から特別な見た目を決める */
export const specialOf = (name: string, originFamily: FamilyId): CharaSpecial | undefined => {
  if (name === '真田幸村' && originFamily === 'sanada') return 'yukimura';
  if (name === '直江兼続' && originFamily === 'uesugi') return 'kanetsugu';
  return undefined;
};

/** デフォルメ武将キャラ。全身 (240x260) か胸から上 (160x160) */
export const Chara = memo(function Chara({ kind, family, crop = 'full', mood = 'normal', size, title, special }: CharaProps) {
  const v = parts(kind, family, special);
  const C = FAMILIES[family].colors;
  const mon = MON[family];
  const bigStache = v.stache !== '';
  const happy = mood === 'happy';
  const full = crop === 'full';
  const height = full ? Math.round((size * 260) / 240) : size;
  const outline = { stroke: D, strokeWidth: 3, strokeLinejoin: 'round' as const };

  return (
    <svg
      width={size}
      height={height}
      viewBox={full ? '0 0 240 260' : '40 0 160 160'}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block' }}
    >
      <path d={v.backA} fill={v.backFill} {...outline} />
      <path d={mon} transform={v.backMonT} fill={C.monFill} />
      <path d={v.horns} fill={GOLD} {...outline} />
      <path d={v.backLines} fill="none" stroke={family === 'takeda' ? '#D9D2C7' : '#B8860B'} strokeWidth={2.5} strokeLinecap="round" />
      <path d={v.wLine} fill="none" stroke={v.wLineColor} strokeWidth={v.wLineW} strokeLinecap="round" />
      <path d={v.wA} fill={v.wAFill} {...outline} />
      <path d={v.wB} fill={v.wBFill} stroke={D} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <path d={mon} transform={v.wMonT} fill={v.wMonFill} />
      {v.flagText && (
        <text x={40} y={64} textAnchor="middle" fontSize={30} fontWeight={700} fill="#23407A" fontFamily="'Hiragino Mincho ProN','Yu Mincho',serif">
          {v.flagText}
        </text>
      )}
      <path d="M88 212 L84 236 L116 236 L118 212 Z M122 212 L124 236 L156 236 L152 212 Z" fill="#2B1A12" {...outline} />
      <path
        d="M86 232 L112 232 Q118 232 118 238 Q118 245 112 245 L86 245 Q80 245 80 238 Q80 232 86 232 Z M128 232 L154 232 Q160 232 160 238 Q160 245 154 245 L128 245 Q122 245 122 238 Q122 232 128 232 Z"
        fill="#2B1A12"
        {...outline}
      />
      <path d="M84 140 C84 132 156 132 156 140 L172 214 L68 214 Z" fill={C.main} {...outline} />
      <path d={v.trim} fill="none" stroke={C.trim} strokeWidth={3.5} strokeLinecap="round" />
      <path d={v.plates} fill="none" stroke={D} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M120 150 L120 212" fill="none" stroke={D} strokeWidth={2.5} />
      <path d="M92 180 L148 180 L148 189 L92 189 Z" fill="#FFFFFF" stroke={D} strokeWidth={2.5} />
      <path d="M108 135 L120 152 L132 135 Z" fill="#FFFFFF" stroke={D} strokeWidth={2.5} strokeLinejoin="round" />
      {v.mons.map((t) => (
        <path key={t} d={mon} transform={t} fill={C.monFill} />
      ))}
      <path
        d="M86 144 C70 140 60 130 58 118 L70 112 C74 124 82 130 94 134 Z M154 144 C170 150 176 164 174 176 L162 178 C162 168 158 160 148 154 Z"
        fill="#2B1A12"
        {...outline}
      />
      <path d={circle(168, 184, 9)} fill="#FFDDBE" stroke={D} strokeWidth={3} />
      <path d={v.wC} fill={v.wCFill} {...outline} />
      <path d={circle(63, 112, 9)} fill="#FFDDBE" stroke={D} strokeWidth={3} />
      <path d="M86 104 a34 28 0 1 0 68 0 a34 28 0 1 0 -68 0 Z" fill="#FFDDBE" stroke={D} strokeWidth={3} />
      <path d={v.beard} fill={v.beardFill} stroke={D} strokeWidth={2.5} strokeLinejoin="round" />
      {happy && (
        <path d={bigStache ? 'M112 121 Q120 133 128 121 Z' : 'M111 117 Q120 130 129 117 Z'} fill="#8A3B2A" stroke={D} strokeWidth={2} strokeLinejoin="round" />
      )}
      {!happy && !bigStache && <path d="M114 119 Q120 123 126 119" fill="none" stroke={D} strokeWidth={2.5} strokeLinecap="round" />}
      <path d={v.stache} fill={v.stacheFill} stroke={D} strokeWidth={2} strokeLinejoin="round" />
      <path d={v.stacheLine} fill="none" stroke={D} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={v.helmA} fill={v.helmFill} {...outline} />
      <path d={v.band} fill={GOLD} {...outline} />
      <path d={v.flaps} fill={v.helmFill} {...outline} />
      <path d={mon} transform={v.flapL} fill={C.monFill} />
      <path d={mon} transform={v.flapR} fill={C.monFill} />
      <path d={v.frontA} fill={v.frontAFill} {...outline} />
      <path d={v.frontB} fill="#2B1A12" stroke={D} strokeWidth={1.5} />
      <path d={mon} transform={v.frontMonT} fill={GOLD} />
      {v.frontText && (
        <text
          x={120}
          y={54}
          textAnchor="middle"
          fontSize={54}
          fontWeight={700}
          fill={GOLD}
          stroke={D}
          strokeWidth={3.2}
          paintOrder="stroke"
          fontFamily="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif"
        >
          {v.frontText}
        </text>
      )}
      <path d={mon} transform={v.hatMonT} fill={C.monFill} />
      {happy ? (
        <path d={v.patch ? 'M128 105 Q134 97 140 105' : 'M100 105 Q106 97 112 105 M128 105 Q134 97 140 105'} fill="none" stroke={D} strokeWidth={3.5} strokeLinecap="round" />
      ) : (
        <>
          <path d="M101 103 a5 6.5 0 1 0 10 0 a5 6.5 0 1 0 -10 0 Z M129 103 a5 6.5 0 1 0 10 0 a5 6.5 0 1 0 -10 0 Z" fill={D} />
          <path d={`${circle(107.8, 100.5, 1.9)} ${circle(135.8, 100.5, 1.9)}`} fill="#FFFFFF" />
        </>
      )}
      {v.patch && (
        <>
          <path d="M86 93 L99 99 M113 100 L154 94" fill="none" stroke={D} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M98 97 L114 97 Q115 108 106 111 Q97 108 98 97 Z" fill="#2B1A12" stroke={D} strokeWidth={2} />
        </>
      )}
      <path d={v.brows} fill="none" stroke={D} strokeWidth={4} strokeLinecap="round" />
      <path d="M90 113 a5 3 0 1 0 10 0 a5 3 0 1 0 -10 0 Z M140 113 a5 3 0 1 0 10 0 a5 3 0 1 0 -10 0 Z" fill="#F7A6A0" />
    </svg>
  );
});
