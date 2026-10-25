import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export const STAGE_W = 1280;
export const STAGE_H = 800;

interface StageInfo {
  scale: number;
  ref: RefObject<HTMLDivElement | null>;
}

const StageContext = createContext<StageInfo>({ scale: 1, ref: { current: null } });
export const useStage = () => useContext(StageContext);

/** 1280x800 の画面を、ウィンドウに収まるよう拡大縮小して表示する */
export function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return (
    <div className="viewport">
      <div style={{ width: STAGE_W * scale, height: STAGE_H * scale, position: 'relative' }}>
        <div ref={ref} className="stage" style={{ transform: `scale(${scale})` }}>
          <StageContext.Provider value={{ scale, ref }}>{children}</StageContext.Provider>
        </div>
      </div>
    </div>
  );
}
