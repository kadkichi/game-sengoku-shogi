/** タイトル・結果画面の空と丘 (装飾) */
export function Scenery({ hillTop = 520 }: { hillTop?: number }) {
  return (
    <div aria-hidden="true">
      <div className="sun" />
      <div className="cloud" style={{ left: 110, top: 112, width: 170, height: 46 }} />
      <div className="cloud" style={{ left: 160, top: 86, width: 84, height: 64 }} />
      <div className="cloud" style={{ left: 980, top: 230, width: 140, height: 38 }} />
      <div className="hill" style={{ left: -220, top: hillTop, width: 1020, height: 520, background: '#9ed98f' }} />
      <div className="hill" style={{ left: 500, top: hillTop + 40, width: 1120, height: 540, background: '#7cc86e' }} />
    </div>
  );
}
