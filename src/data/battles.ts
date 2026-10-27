import type { ArmyId } from './families';

/**
 * 合戦モード。2つの軍 (families.ts の東軍・西軍など) と、画面に出す言葉をまとめる。
 * 大坂の陣などを足すときは、families.ts に軍を2つ足して、ここに1つ足す
 */
export type BattleId = 'sekigahara' | 'osakaWinter' | 'osakaSummer';

export interface BattleDef {
  id: BattleId;
  name: string;
  /** タイトル画面のボタンの小さな説明 */
  sub: string;
  /** 軍を選ぶ画面の見出し */
  question: string;
  /** 2つの軍。左に出すほうが先 */
  armies: [ArmyId, ArmyId];
  /** 結果画面の見出しの前につける言葉 */
  resultLead: string;
  /** 合戦モードは じっくり (5×6) だけ */
  variant: 'large';
  /** あそびかた画面などで軍の前につける短い名前 */
  short: string;
  /** 合戦の年 (遊び方を選ぶ窓で、年の順に並べる) */
  year: number;
  /**
   * 盤の柄。castle の軍の陣 (奥2段) を城の石垣にする。
   * winter=堀に水・野原に雪、summer=埋められた堀・夏草
   */
  board?: { theme: 'winter' | 'summer'; castle: ArmyId };
}

export const BATTLES: Record<BattleId, BattleDef> = {
  sekigahara: {
    id: 'sekigahara',
    name: '関ヶ原の 合戦',
    sub: '天下分け目の 東西決戦 (じっくり 5×6)',
    question: 'どちらに つく?',
    armies: ['east', 'west'],
    resultLead: '天下分け目の 戦い',
    variant: 'large',
    short: '関ヶ原',
    year: 1600,
  },
  osakaWinter: {
    id: 'osakaWinter',
    name: '大坂冬の陣',
    sub: '大坂城を めぐる 籠城戦 (じっくり 5×6)',
    question: 'どちらに つく?',
    armies: ['winterTokugawa', 'winterToyotomi'],
    resultLead: '大坂冬の陣',
    variant: 'large',
    short: '冬の陣',
    year: 1614,
    board: { theme: 'winter', castle: 'winterToyotomi' },
  },
  osakaSummer: {
    id: 'osakaSummer',
    name: '大坂夏の陣',
    sub: '堀を うめられた 大坂城の 最後の戦い (じっくり 5×6)',
    question: 'どちらに つく?',
    armies: ['summerTokugawa', 'summerToyotomi'],
    resultLead: '大坂夏の陣',
    variant: 'large',
    short: '夏の陣',
    year: 1615,
    board: { theme: 'summer', castle: 'summerToyotomi' },
  },
};

/** 歴史のたたかい。年の順に並べる */
export const BATTLE_IDS: BattleId[] = ['sekigahara', 'osakaWinter', 'osakaSummer'];
