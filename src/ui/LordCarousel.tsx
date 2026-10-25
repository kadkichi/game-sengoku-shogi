import { useCallback, useEffect, useRef, useState } from 'react';
import { FAMILIES, FAMILY_IDS, type FamilyId } from '../data/families';
import { play } from '../audio/sound';
import { Chara } from './Chara';
import { useStage } from './Stage';

const N = FAMILY_IDS.length;
/** 12人を3回並べて、真ん中の組を見せる。端まで来たら気づかれないように真ん中の組へ戻す */
const ITEMS = [...FAMILY_IDS, ...FAMILY_IDS, ...FAMILY_IDS];
const INTERVAL = 2400;

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * タイトル画面: 12家の大将が横にスライドしていくカルーセル。スワイプや矢印でも動かせる。
 * 大将を押すと onSelect で その家を知らせる (紹介を開いているあいだは止める)
 */
export function LordCarousel({ onSelect, stopped = false }: { onSelect: (id: FamilyId) => void; stopped?: boolean }) {
  const { w, compact, scale } = useStage();
  const size = compact ? 112 : 160;
  const cardW = compact ? 170 : 220;
  // 真ん中の大将は大きく表示するので、そのぶん上に余裕を持たせる
  const height = Math.round((size * 260) / 240) + 96;

  const [pos, setPos] = useState(N);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const dragStart = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  /** ドラッグした直後のクリックは「押した」と見なさない */
  const dragged = useRef(false);

  const step = useCallback((d: number) => {
    setAnimate(true);
    setPos((p) => p + d);
  }, []);

  useEffect(() => {
    if (paused || stopped || prefersReducedMotion()) return;
    const id = setInterval(() => step(1), INTERVAL);
    return () => clearInterval(id);
  }, [paused, stopped, step]);

  const onTransitionEnd = (e: React.TransitionEvent) => {
    // カードの拡大・縮小のアニメーション終了は無視する (列そのものの移動だけを見る)
    if (e.target !== e.currentTarget) return;
    if (pos >= 2 * N || pos < N) {
      setAnimate(false);
      setPos((p) => ((p % N) + N) % N + N);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    dragged.current = false;
    setPaused(true);
    setAnimate(false);

  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const dx = (e.clientX - dragStart.current) / scale;
    if (Math.abs(dx) > 8) dragged.current = true;
    setDragX(dx);
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    const dx = dragX;
    dragStart.current = null;
    setDragX(0);
    setAnimate(true);
    // ドラッグした量に応じて何人ぶん動かすか決める
    const moved = Math.round(-dx / cardW);
    if (moved !== 0) setPos((p) => p + moved);
    else if (Math.abs(dx) > 30) step(dx < 0 ? 1 : -1);
    setPaused(false);
  };

  const center = ((pos % N) + N) % N;
  const offset = w / 2 - cardW / 2 - pos * cardW + dragX;

  return (
    <div
      role="region"
      aria-roledescription="カルーセル"
      aria-label="12の大名家"
      style={{ position: 'relative', width: w, height, overflow: 'hidden', touchAction: 'pan-y' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="carousel-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onTransitionEnd={onTransitionEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: animate ? 'transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1)' : 'none',
          height,
        }}
      >
        {ITEMS.map((id, i) => {
          const isCenter = i === pos;
          const f = FAMILIES[id];
          return (
            <button
              key={i}
              className="carousel-card"
              tabIndex={isCenter ? 0 : -1}
              aria-label={`${f.name} ${f.lord}。押すと 家紋と 配下の武将を みる`}
              onClick={() => {
                if (dragged.current) return;
                play('select');
                setAnimate(true);
                setPos(i);
                onSelect(id);
              }}
              style={{ width: cardW, transform: `scale(${isCenter ? 1.12 : 0.9})`, opacity: isCenter ? 1 : 0.8 }}
            >
              <div className="bob" style={{ animationDelay: `${(i % 4) * 0.3}s` }}>
                <Chara kind="K" family={id} size={size} title={isCenter ? f.lord : undefined} />
              </div>
              <div
                style={{
                  padding: '5px 16px', borderRadius: 18, fontSize: compact ? 18 : 19, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap',
                  background: f.colors.border, boxShadow: isCenter ? '0 0 0 3px #fff, 0 4px 0 3px rgba(0,0,0,0.2)' : undefined,
                }}
              >
                {f.lord}
              </div>
            </button>
          );
        })}
      </div>

      <button className="btn carousel-arrow" style={{ left: compact ? 16 : 40 }} aria-label="まえの 大名" onClick={() => step(-1)}>
        ◀
      </button>
      <button className="btn carousel-arrow" style={{ right: compact ? 16 : 40 }} aria-label="つぎの 大名" onClick={() => step(1)}>
        ▶
      </button>
      <p className="sr-only" aria-live="polite">
        {FAMILIES[FAMILY_IDS[center]].name} {FAMILIES[FAMILY_IDS[center]].lord}
      </p>
    </div>
  );
}
