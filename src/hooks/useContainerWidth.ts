import { useCallback, useLayoutEffect, useState } from 'react';

export function useContainerWidth(options: { minDelta?: number } = {}) {
  const { minDelta = 1 } = options;
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [mounted, setMounted] = useState(false);
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setElement(node);
  }, []);

  const measureWidth = useCallback(() => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const nextWidth = Math.floor(rect.width);
    const nextHeight = Math.floor(rect.height);
    if (nextWidth <= 0) return;
    if (nextHeight > 0) {
      setHeight((currentHeight) => (
        Math.abs(currentHeight - nextHeight) >= minDelta ? nextHeight : currentHeight
      ));
    }

    setWidth((currentWidth) => (
      Math.abs(currentWidth - nextWidth) >= minDelta ? nextWidth : currentWidth
    ));
  }, [element, minDelta]);

  useLayoutEffect(() => {
    setMounted(true);
    if (!element) return;

    let animationFrame = window.requestAnimationFrame(measureWidth);

    const queueMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureWidth);
    };

    measureWidth();

    const observer = new ResizeObserver(queueMeasure);
    observer.observe(element);
    window.addEventListener('resize', queueMeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', queueMeasure);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [element, measureWidth]);

  return { width, height, containerRef, mounted, measureWidth };
}
