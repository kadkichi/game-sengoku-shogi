import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/**
 * 画面は「設計上の大きさ」で作り、ウィンドウに合わせて拡大縮小する。
 * - ふつう (PC・タブレット): 高さ 800。横幅は端末の縦横比に合わせて 1280〜1800
 * - コンパクト (スマホの横向き): 高さ 560。横幅は 900〜1320。文字やボタンが大きく見える
 */
export interface Layout {
  w: number;
  h: number;
  compact: boolean;
  scale: number;
}

interface StageInfo extends Layout {
  ref: RefObject<HTMLDivElement | null>;
}

/** これより低い画面はスマホの横向きとみなす */
const COMPACT_BELOW = 520;
/** 縦向きでこの幅より狭ければ「よこに してね」を出す */
const ROTATE_BELOW = 1000;

export function computeLayout(vw: number, vh: number): Layout {
  const compact = vh < COMPACT_BELOW;
  const h = compact ? 560 : 800;
  const [minW, maxW] = compact ? [900, 1320] : [1280, 1800];
  const w = Math.min(maxW, Math.max(minW, Math.round((h * vw) / vh)));
  return { w, h, compact, scale: Math.min(vw / w, vh / h) };
}

const StageContext = createContext<StageInfo>({ ...computeLayout(1280, 800), ref: { current: null } });
export const useStage = () => useContext(StageContext);

export function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ vw: window.innerWidth, vh: window.innerHeight });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    // セーフエリア (ノッチ) の内側の大きさで計算する
    const update = () => setSize({ vw: el.clientWidth, vh: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = computeLayout(size.vw, size.vh);
  const portrait = size.vh > size.vw && size.vw < ROTATE_BELOW;

  return (
    <div ref={viewportRef} className="viewport">
      <div style={{ width: layout.w * layout.scale, height: layout.h * layout.scale, position: 'relative' }} aria-hidden={portrait || undefined}>
        <div
          ref={ref}
          className={`stage${layout.compact ? ' compact' : ''}`}
          style={{ width: layout.w, height: layout.h, transform: `scale(${layout.scale})` }}
        >
          <StageContext.Provider value={{ ...layout, ref }}>{children}</StageContext.Provider>
        </div>
      </div>
      {portrait && <RotateNotice />}
    </div>
  );
}

/** 縦向きのスマホで、横向きにするよう案内する */
function RotateNotice() {
  return (
    <div className="rotate-notice" role="alertdialog" aria-label="よこむきに してね">
      <svg className="rotate-phone" viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
        <rect x="38" y="14" width="44" height="80" rx="9" fill="#fff" stroke="#2b2b2b" strokeWidth="5" />
        <rect x="45" y="24" width="30" height="58" rx="3" fill="#bfe6ff" />
        <circle cx="60" cy="88" r="2.5" fill="#2b2b2b" />
      </svg>
      <svg viewBox="0 0 120 40" width="120" height="40" aria-hidden="true">
        <path d="M20 12 Q60 40 100 12" fill="none" stroke="#d0392e" strokeWidth="5" strokeLinecap="round" />
        <path d="M100 12 L88 12 M100 12 L100 24" fill="none" stroke="#d0392e" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <p className="display" style={{ margin: 0, fontSize: 34 }}>
        よこに してね
      </p>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--muted)', lineHeight: 1.6 }}>
        スマホを よこむきに すると
        <br />
        あそべるよ
      </p>
    </div>
  );
}
