export type FamilyId =
  | 'oda'
  | 'takeda'
  | 'uesugi'
  | 'toyotomi'
  | 'tokugawa'
  | 'mori'
  | 'hojo'
  | 'imagawa'
  | 'date'
  | 'shimazu'
  | 'chosokabe'
  | 'sanada';

/**
 * 必殺技の仕組み。見た目の名前は家ごとに違っても、仕組みが同じなら同じ type
 * shoot      足軽の前2マスまでの敵を取る (織田・今川)
 * double     大将以外を2回動かす。2回目は取れない (武田)
 * kingDouble 大将を2回動かす (上杉)
 * drop2      持ち駒を2枚続けて打つ (豊臣)
 * undo       相手の直前の1手を取り消して指し直させる (徳川)
 * arrows     駒を3枚まで1マスずつ前に進める。取れない (毛利)
 * shield     次の相手の番、自分の駒は取られない。手番を使わない (北条)
 * slideDiag  大将以外の駒1枚を斜めに何マスでも (伊達)
 * pull       相手の駒1枚を1マス引き寄せ、続けて自分の駒を1回動かせる (島津)
 * spawn      新しい足軽を1枚打つ (長宗我部)
 * yukimura   真田幸村がまっすぐ前に何マスでも (真田)
 */
export type SkillType =
  | 'shoot'
  | 'double'
  | 'kingDouble'
  | 'drop2'
  | 'undo'
  | 'arrows'
  | 'shield'
  | 'slideDiag'
  | 'pull'
  | 'spawn'
  | 'yukimura';

export interface Family {
  id: FamilyId;
  name: string;
  army: string;
  lord: string;
  gold: [string, string];
  silver: [string, string];
  skill: {
    type: SkillType;
    name: string;
    /** 合戦画面の短い説明 */
    short: string;
    /** 大名選択画面の説明 */
    desc: string;
    /** 3×4 (かんたん) だけの追加ルール */
    smallNote?: string;
    /** 発動したときの掛け声 */
    phrase: string;
  };
  colors: {
    main: string;
    /** 枠・ラベル。白文字を載せるので濃い色 */
    border: string;
    tile: string;
    helm: string;
    trim: string;
    monFill: string;
  };
}

const GOLD = '#F5C033';

export const FAMILIES: Record<FamilyId, Family> = {
  oda: {
    id: 'oda', name: '織田家', army: '織田軍', lord: '織田信長',
    gold: ['柴田勝家', '明智光秀'], silver: ['羽柴秀吉', '前田利家'],
    skill: {
      type: 'shoot', name: '鉄砲三段撃ち', phrase: '撃て!',
      short: '足軽の まっすぐ前 2マスまでの てきを 1まい とる',
      desc: '足軽の まっすぐ前 2マスまでにいる てきの駒を 1まい とる (大将は とれない)',
    },
    colors: { main: '#2E2A2A', border: '#2B2B2B', tile: '#FFECE8', helm: '#2E2A2A', trim: '#D9302C', monFill: GOLD },
  },
  takeda: {
    id: 'takeda', name: '武田家', army: '武田軍', lord: '武田信玄',
    gold: ['山県昌景', '馬場信春'], silver: ['真田幸隆', '山本勘助'],
    skill: {
      type: 'double', name: '風林火山', phrase: '疾きこと風の如し!',
      short: '大将いがいの駒を 2かい つづけて うごかせる',
      desc: '大将いがいの駒を 2かい つづけて うごかせる (2かいめは 駒を とれない)',
    },
    colors: { main: '#D9302C', border: '#C42F2F', tile: '#FFF4D1', helm: '#D9302C', trim: GOLD, monFill: GOLD },
  },
  uesugi: {
    id: 'uesugi', name: '上杉家', army: '上杉軍', lord: '上杉謙信',
    gold: ['柿崎景家', '直江兼続'], silver: ['宇佐美定満', '甘粕景持'],
    skill: {
      type: 'kingDouble', name: '毘沙門天の加護', phrase: '毘沙門天よ、われに力を!',
      short: '大将を 2かい つづけて うごかせる',
      desc: '大将を 2かい つづけて うごかせる (2かいめで 駒を とっても いい)',
      smallNote: 'このわざでは 相手の一番奥の段に 入れない',
    },
    colors: { main: '#23407A', border: '#23407A', tile: '#E8F0FF', helm: '#F2F4F8', trim: '#FFFFFF', monFill: '#FFFFFF' },
  },
  toyotomi: {
    id: 'toyotomi', name: '豊臣家', army: '豊臣軍', lord: '豊臣秀吉',
    gold: ['石田三成', '加藤清正'], silver: ['福島正則', '黒田官兵衛'],
    skill: {
      type: 'drop2', name: '一夜城', phrase: 'ひと晩で 城を 建てよ!',
      short: 'もちごまを 2まい つづけて 打てる',
      desc: 'もちごまを 2まい つづけて 打てる (もちごまが 2まい いじょう あるときだけ)',
    },
    colors: { main: '#E8731E', border: '#B04E0C', tile: '#FFE8D6', helm: '#E8731E', trim: GOLD, monFill: '#FFF3C4' },
  },
  tokugawa: {
    id: 'tokugawa', name: '徳川家', army: '徳川軍', lord: '徳川家康',
    gold: ['本多忠勝', '井伊直政'], silver: ['酒井忠次', '榊原康政'],
    skill: {
      type: 'undo', name: '鳴くまで待とう', phrase: 'まあ、待たれよ!',
      short: 'あいての さっきの1手を なかったことにする',
      desc: 'あいての さっきの1手を なかったことにして、指しなおさせる (おなじ手は もう指せない)',
    },
    colors: { main: '#2F6B3A', border: '#2F6B3A', tile: '#E6F4E4', helm: '#2F6B3A', trim: GOLD, monFill: GOLD },
  },
  mori: {
    id: 'mori', name: '毛利家', army: '毛利軍', lord: '毛利元就',
    gold: ['吉川元春', '小早川隆景'], silver: ['毛利隆元', '清水宗治'],
    skill: {
      type: 'arrows', name: '三本の矢', phrase: '三本 そろえば 折れぬ!',
      short: '大将いがいの駒を 3まいまで 1マスずつ 前に すすめる',
      desc: '大将いがいの駒を 3まいまで、1マスずつ まっすぐ前に すすめる (駒は とれない)',
    },
    colors: { main: '#6B3FA0', border: '#5B3290', tile: '#F0E8FA', helm: '#6B3FA0', trim: '#FFFFFF', monFill: '#FFFFFF' },
  },
  hojo: {
    id: 'hojo', name: '北条家', army: '北条軍', lord: '北条氏康',
    gold: ['北条綱成', '北条氏照'], silver: ['北条幻庵', '風魔小太郎'],
    skill: {
      type: 'shield', name: '小田原城', phrase: '城の守りは かたいぞ!',
      short: 'つぎの あいての番、自分の駒は とられない',
      desc: 'つぎの あいての番、自分の駒は どれも とられない (この技では 手番を使わない。そのあと ふつうに 指す)',
    },
    colors: { main: '#1F8A8A', border: '#17706F', tile: '#E0F5F4', helm: '#1F8A8A', trim: '#FFFFFF', monFill: '#FFFFFF' },
  },
  imagawa: {
    id: 'imagawa', name: '今川家', army: '今川軍', lord: '今川義元',
    gold: ['太原雪斎', '岡部元信'], silver: ['朝比奈泰朝', '鵜殿長照'],
    skill: {
      type: 'shoot', name: '東海一の弓取', phrase: '射よ!',
      short: '足軽の まっすぐ前 2マスまでの てきを 1まい とる',
      desc: '足軽の まっすぐ前 2マスまでにいる てきの駒を 1まい とる (大将は とれない)',
    },
    colors: { main: '#A3324F', border: '#8E2742', tile: '#FBE6EF', helm: '#A3324F', trim: GOLD, monFill: GOLD },
  },
  date: {
    id: 'date', name: '伊達家', army: '伊達軍', lord: '伊達政宗',
    gold: ['片倉小十郎', '伊達成実'], silver: ['鬼庭綱元', '支倉常長'],
    skill: {
      type: 'slideDiag', name: '独眼竜', phrase: '竜の ごとく かけよ!',
      short: '大将いがいの駒 1まいを ななめに 何マスでも うごかす',
      desc: '大将いがいの駒 1まいを、ななめに 何マスでも うごかす (駒は とびこえない。とまった先の てきは とれる)',
    },
    colors: { main: '#3A3A44', border: '#3A3A44', tile: '#EDEDF0', helm: '#2E2E36', trim: GOLD, monFill: GOLD },
  },
  shimazu: {
    id: 'shimazu', name: '島津家', army: '島津軍', lord: '島津義弘',
    gold: ['島津家久', '島津歳久'], silver: ['島津豊久', '新納忠元'],
    skill: {
      type: 'pull', name: '釣り野伏せ', phrase: 'かかったな!',
      short: 'あいての駒 (大将いがい) を 1マス ひきよせて、つづけて 自分の駒を うごかせる',
      desc: 'あいての駒 1まいを こちらがわへ 1マス ひきよせて、つづけて 自分の駒を 1かい うごかせる (あいての大将は ひきよせられない。ひきよせた駒を とっても いい)',
    },
    colors: { main: '#7A4A24', border: '#6A3C1A', tile: '#F5EADF', helm: '#7A4A24', trim: '#FFFFFF', monFill: '#FFFFFF' },
  },
  chosokabe: {
    id: 'chosokabe', name: '長宗我部家', army: '長宗我部軍', lord: '長宗我部元親',
    gold: ['長宗我部信親', '香宗我部親泰'], silver: ['吉良親貞', '谷忠澄'],
    skill: {
      type: 'spawn', name: '一領具足', phrase: '田畑から 出陣じゃ!',
      short: '新しい 足軽を 1まい 盤に 打てる',
      desc: 'もちごまが なくても、新しい 足軽を 1まい 盤に 打てる (足軽を 打てるマスだけ)',
    },
    colors: { main: '#6E9A1E', border: '#4E7210', tile: '#EEF6DC', helm: '#6E9A1E', trim: '#2B2B2B', monFill: '#FFFFFF' },
  },
  sanada: {
    id: 'sanada', name: '真田家', army: '真田軍', lord: '真田昌幸',
    gold: ['真田幸村', '真田信之'], silver: ['猿飛佐助', '霧隠才蔵'],
    skill: {
      type: 'yukimura', name: '六文銭', phrase: '日本一の兵、見参!',
      short: '真田幸村が まっすぐ前に 何マスでも すすむ',
      desc: '真田幸村が、まっすぐ前に 何マスでも すすむ (駒は とびこえない。とまった先の てきは とれる。幸村が とられたら 使えない)',
    },
    colors: { main: '#B0201C', border: '#8E1A16', tile: '#FBE3E1', helm: '#B0201C', trim: '#2B2B2B', monFill: GOLD },
  },
};

export const FAMILY_IDS: FamilyId[] = [
  'oda', 'takeda', 'uesugi', 'toyotomi',
  'tokugawa', 'mori', 'hojo', 'imagawa',
  'date', 'shimazu', 'chosokabe', 'sanada',
];

/** 真田家の必殺技を使える駒 */
export const YUKIMURA = '真田幸村';

export const MODES = {
  small: { label: 'かんたん', size: '3×4', desc: 'すぐ おわる。大将が 相手の一番奥に 入っても かち' },
  large: { label: 'じっくり', size: '5×6', desc: '駒が おおくて じっくり たたかえる' },
} as const;
