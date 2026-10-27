import type { FamilyId, SkillType } from '../data/families';

export type Side = 'sente' | 'gote';
/** K=大将 G=金の武将 S=銀の武将 P=足軽 V=先鋒 (合戦モードの、足軽の場所に置く武将) */
export type Kind = 'K' | 'G' | 'S' | 'P' | 'V';

/** small = 3×4 (かんたん)、large = 5×6 (じっくり) */
export type Variant = 'small' | 'large';

export interface Pos {
  x: number;
  y: number;
}

export interface Piece {
  id: string;
  kind: Kind;
  owner: Side;
  promoted: boolean;
  /** 武将名。寝返っても変わらない */
  name: string;
  /** 最初に仕えていた家 */
  originFamily: FamilyId;
}

export type Cell = Piece | null;

/**
 * 必殺技の途中の状態。step は「次が何回目の操作か」。
 * step が 1 のあいだは取り消せる。2 以上は確定済み
 */
export interface SkillPhase {
  type: SkillType;
  step: number;
  /** 三本の矢: もう動かした駒 */
  moved: string[];
}

export type GameEvent =
  | { type: 'move'; side: Side; pieceId: string; from: Pos; to: Pos }
  | { type: 'drop'; side: Side; pieceId: string; to: Pos }
  | { type: 'capture'; side: Side; piece: Piece; at: Pos; by: 'move' | 'shoot' }
  | { type: 'promote'; side: Side; piece: Piece; at: Pos }
  | { type: 'skill'; side: Side; family: FamilyId }
  | { type: 'shield'; side: Side }
  | { type: 'undo'; side: Side }
  | { type: 'pull'; side: Side; piece: Piece; from: Pos; to: Pos }
  | { type: 'spawn'; side: Side; pieceId: string; to: Pos }
  | { type: 'turncoat'; side: Side; piece: Piece; at: Pos }
  | { type: 'win'; side: Side; reason: WinReason }
  | { type: 'draw' };

export type WinReason = 'capture' | 'try';

export type Action =
  | { type: 'move'; from: Pos; to: Pos }
  | { type: 'drop'; pieceId: string; to: Pos }
  | { type: 'activateSkill' }
  | { type: 'cancelSkill' }
  | { type: 'endSkill' }
  | { type: 'shoot'; from: Pos; to: Pos }
  | { type: 'pull'; from: Pos; to: Pos }
  | { type: 'spawn'; to: Pos }
  | { type: 'turncoat'; at: Pos }
  | { type: 'bombard'; to: Pos };

/** 鳴くまで待とう で戻すための、ある手番の始まりの局面 */
export type Snapshot = Omit<GameState, 'thisTurnStart' | 'lastTurnStart' | 'events'>;

export interface GameState {
  variant: Variant;
  cols: number;
  rows: number;
  /** board[y][x]。y=0 が後手の奥、y=rows-1 が先手の奥 */
  board: Cell[][];
  hands: Record<Side, Piece[]>;
  turn: Side;
  families: Record<Side, FamilyId>;
  skillUsed: Record<Side, boolean>;
  skillPhase: SkillPhase | null;
  /** 小田原城: この側の駒は、次の相手の番のあいだ取られない */
  shield: Side | null;
  /** 鳴くまで待とう で取り消された手。指し直しでは同じ手を指せない */
  forbidden: Action | null;
  /** この手番で最初に指した手 / ひとつ前の手番で最初に指した手 */
  turnFirst: Action | null;
  lastTurnFirst: Action | null;
  /** この手番の始まり / ひとつ前の手番の始まり */
  thisTurnStart: Snapshot | null;
  lastTurnStart: Snapshot | null;
  winner: Side | null;
  winReason: WinReason | null;
  draw: boolean;
  /** 指した手数 (必殺技の複数回の操作も1手) */
  moveCount: number;
  /** 手番が終わるごとの局面キー */
  positions: string[];
  /** 直前の操作で起きたこと (演出用) */
  events: GameEvent[];
  /**
   * CPU の読みの途中の局面。true のあいだは「鳴くまで待とう」用の局面の保存を省いて速くする
   * (読みの先では、徳川の技は使えない扱いになる)
   */
  search?: boolean;
}
