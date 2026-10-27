import { useState } from 'react';
import type { ArmyId, FamilyId } from './data/families';
import { BATTLES, type BattleId } from './data/battles';
import { ArmySelectScreen } from './ui/ArmySelectScreen';
import type { Side, Variant } from './engine/types';
import type { CpuSetting } from './ai/cpu';
import { BattleScreen, type BattleResult } from './ui/BattleScreen';
import { CharacterSheet } from './ui/CharacterSheet';
import { PrintSheets } from './ui/PrintSheets';
import { ResultScreen } from './ui/ResultScreen';
import { SelectScreen } from './ui/SelectScreen';
import { Stage } from './ui/Stage';
import { TitleScreen, type PlayMode } from './ui/TitleScreen';

type Screen =
  | { name: 'title' }
  | { name: 'select' }
  | { name: 'armySelect' }
  | { name: 'battle'; round: number }
  | { name: 'result'; result: BattleResult };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [families, setFamilies] = useState<Record<Side, FamilyId>>({ sente: 'oda', gote: 'uesugi' });
  const [variant, setVariant] = useState<Variant>('small');
  const [cpu, setCpu] = useState<CpuSetting | null>(null);
  /** ひとりで (CPU と) 遊ぶか、ふたりで遊ぶか。タイトル画面で選ぶ */
  const [mode, setMode] = useState<PlayMode>('solo');
  const [round, setRound] = useState(0);
  /** 合戦モード (関ヶ原など) で遊ぶときの合戦と、両軍。null ならふつうの対戦 */
  const [battle, setBattle] = useState<BattleId | null>(null);
  const [armies, setArmies] = useState<Record<Side, ArmyId>>({ sente: 'east', gote: 'west' });
  const battleDef = battle ? BATTLES[battle] : null;

  const startBattle = () => {
    setRound(round + 1);
    setScreen({ name: 'battle', round: round + 1 });
  };

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('print')) return <PrintSheets />;
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('chars')) {
    return (
      <Stage>
        <CharacterSheet />
      </Stage>
    );
  }

  return (
    <Stage>
      {screen.name === 'title' && (
        <TitleScreen
          onStart={(m, b) => {
            setMode(m);
            setBattle(b);
            setScreen(b ? { name: 'armySelect' } : { name: 'select' });
          }}
        />
      )}
      {screen.name === 'select' && (
        <SelectScreen
          initial={families}
          initialVariant={variant}
          initialCpu={cpu}
          solo={mode === 'solo'}
          onBack={() => setScreen({ name: 'title' })}
          onStart={(f, v, c) => {
            setFamilies(f);
            setVariant(v);
            setCpu(c);
            startBattle();
          }}
        />
      )}
      {screen.name === 'armySelect' && battleDef && (
        <ArmySelectScreen
          battle={battleDef}
          initial={armies}
          initialCpu={cpu}
          solo={mode === 'solo'}
          onBack={() => setScreen({ name: 'title' })}
          onStart={(a, c) => {
            setArmies(a);
            setCpu(c);
            startBattle();
          }}
        />
      )}
      {screen.name === 'battle' && (
        <BattleScreen
          key={screen.round}
          families={battleDef ? armies : families}
          variant={battleDef ? battleDef.variant : variant}
          battle={battleDef}
          cpu={cpu}
          onFinish={(result) => setScreen({ name: 'result', result })}
          onQuit={() => setScreen({ name: 'title' })}
        />
      )}
      {screen.name === 'result' && (
        <ResultScreen
          result={screen.result}
          cpu={cpu}
          battle={battleDef}
          onRematch={startBattle}
          onReselect={() => setScreen(battleDef ? { name: 'armySelect' } : { name: 'select' })}
          onTitle={() => setScreen({ name: 'title' })}
        />
      )}
    </Stage>
  );
}
