import { useState } from 'react';
import type { FamilyId } from './data/families';
import type { Side, Variant } from './engine/types';
import type { CpuSetting } from './ai/cpu';
import { BattleScreen, type BattleResult } from './ui/BattleScreen';
import { CharacterSheet } from './ui/CharacterSheet';
import { ResultScreen } from './ui/ResultScreen';
import { SelectScreen } from './ui/SelectScreen';
import { Stage } from './ui/Stage';
import { TitleScreen } from './ui/TitleScreen';

type Screen =
  | { name: 'title' }
  | { name: 'select' }
  | { name: 'battle'; round: number }
  | { name: 'result'; result: BattleResult };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [families, setFamilies] = useState<Record<Side, FamilyId>>({ sente: 'oda', gote: 'uesugi' });
  const [variant, setVariant] = useState<Variant>('small');
  const [cpu, setCpu] = useState<CpuSetting | null>(null);
  const [round, setRound] = useState(0);

  const startBattle = () => {
    setRound(round + 1);
    setScreen({ name: 'battle', round: round + 1 });
  };

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('chars')) {
    return (
      <Stage>
        <CharacterSheet />
      </Stage>
    );
  }

  return (
    <Stage>
      {screen.name === 'title' && <TitleScreen onStart={() => setScreen({ name: 'select' })} />}
      {screen.name === 'select' && (
        <SelectScreen
          initial={families}
          initialVariant={variant}
          initialCpu={cpu}
          onBack={() => setScreen({ name: 'title' })}
          onStart={(f, v, c) => {
            setFamilies(f);
            setVariant(v);
            setCpu(c);
            startBattle();
          }}
        />
      )}
      {screen.name === 'battle' && (
        <BattleScreen
          key={screen.round}
          families={families}
          variant={variant}
          cpu={cpu}
          onFinish={(result) => setScreen({ name: 'result', result })}
          onQuit={() => setScreen({ name: 'title' })}
        />
      )}
      {screen.name === 'result' && (
        <ResultScreen
          result={screen.result}
          cpu={cpu}
          onRematch={startBattle}
          onReselect={() => setScreen({ name: 'select' })}
          onTitle={() => setScreen({ name: 'title' })}
        />
      )}
    </Stage>
  );
}
