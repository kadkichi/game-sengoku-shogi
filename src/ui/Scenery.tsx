import { useStage } from './Stage';

/** タイトル・結果画面の空と丘 (装飾)。hillTop は画面の高さに対する割合 */
export function Scenery({ hillTop = 0.65 }: { hillTop?: number }) {
  const { w, h } = useStage();
  const top = Math.round(h * hillTop);
  return (
    <div aria-hidden="true">
      <div className="sun" style={{ right: Math.round(w * 0.12), top: Math.round(h * 0.08) }} />
      <div className="cloud" style={{ left: 110, top: h * 0.14, width: 170, height: 46 }} />
      <div className="cloud" style={{ left: 160, top: h * 0.14 - 26, width: 84, height: 64 }} />
      <div className="cloud" style={{ left: w * 0.77, top: h * 0.29, width: 140, height: 38 }} />
      <div className="hill" style={{ left: -220, top, width: w * 0.8, height: 520, background: '#9ed98f' }} />
      <div className="hill" style={{ left: w * 0.39, top: top + 40, width: w * 0.9, height: 540, background: '#7cc86e' }} />
    </div>
  );
}
