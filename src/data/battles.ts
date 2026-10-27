import type { ArmyId } from './families';

/**
 * 合戦モード。2つの軍 (families.ts の東軍・西軍など) と、画面に出す言葉をまとめる。
 * 大坂の陣などを足すときは、families.ts に軍を2つ足して、ここに1つ足す
 */
export type BattleId = 'sekigahara';

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
  },
};

export const BATTLE_IDS: BattleId[] = ['sekigahara'];

/**
 * 「ひとりで / ふたりで あそぶ」のあとに出す、あそびかたの一覧。
 * battle が null なら ふつうの大名どうしの対戦。ready=false は まだ遊べない (じゅんび中)
 */
export const PLAY_MENU: { battle: BattleId | null; name: string; sub: string; ready: boolean }[] = [
  { battle: null, name: '大名の たたかい', sub: '12の 大名家から えらぶ', ready: true },
  { battle: 'sekigahara', name: '関ヶ原の 合戦', sub: '東軍 と 西軍 (じっくり 5×6)', ready: true },
  { battle: null, name: '大坂冬の陣', sub: 'じゅんび中', ready: false },
  { battle: null, name: '大坂夏の陣', sub: 'じゅんび中', ready: false },
];
