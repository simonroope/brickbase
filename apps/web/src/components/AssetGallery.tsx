"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const ITEM_WIDTH_PX = 192;
const GAP_PX = 16;
const ARROW_RESERVE_PX = 112;

export function galleryVisibleCount(viewportWidth: number, imageCount: number): number {
  if (imageCount <= 0) return 1;
  if (viewportWidth <= 0) return imageCount;
  const withoutArrows = Math.max(
    1,
    Math.floor((viewportWidth + GAP_PX) / (ITEM_WIDTH_PX + GAP_PX))
  );
  if (withoutArrows >= imageCount) return imageCount;
  return Math.min(
    imageCount,
    Math.max(1, Math.floor((viewportWidth - ARROW_RESERVE_PX + GAP_PX) / (ITEM_WIDTH_PX + GAP_PX)))
  );
}

export function AssetGallery({
  images,
  selectedIndex = 0,
  onSelect,
}: {
  images: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.max(1, images.length));
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      setVisibleCount(galleryVisibleCount(el.clientWidth, images.length));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [images.length]);

  if (images.length === 0) return null;

  const count = images.length;
  const visibleCountClamped = Math.min(visibleCount, count);
  const start = ((startIndex % count) + count) % count;
  const visible = Array.from({ length: visibleCountClamped }, (_, i) => {
    const imageIndex = (start + i) % count;
    return { uri: images[imageIndex], imageIndex };
  });
  const showArrows = count > visibleCountClamped;

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-sm font-medium text-text-muted">Gallery</h2>
      <div ref={viewportRef} className="flex w-full min-w-0 items-center gap-3">
        {showArrows && (
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => setStartIndex((current) => (current - 1 + count) % count)}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-2xl leading-none text-text-primary hover:bg-surface-muted"
          >
            ‹
          </button>
        )}
        <div className="flex min-w-0 flex-1 gap-4 overflow-hidden">
          {visible.map(({ uri, imageIndex }) =>
            uri ? (
              <button
                key={`${uri}-${imageIndex}`}
                type="button"
                onClick={() => onSelect?.(imageIndex)}
                aria-current={selectedIndex === imageIndex ? "true" : undefined}
                className={`relative h-32 w-48 shrink-0 overflow-hidden rounded-lg ${
                  selectedIndex === imageIndex ? "ring-2 ring-brand" : ""
                }`}
              >
                <Image
                  src={uri}
                  alt={`View ${imageIndex + 1}`}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </button>
            ) : null
          )}
        </div>
        {showArrows && (
          <button
            type="button"
            aria-label="Next image"
            onClick={() => setStartIndex((current) => (current + 1) % count)}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-2xl leading-none text-text-primary hover:bg-surface-muted"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
