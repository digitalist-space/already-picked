"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type FeaturedGuideItem = {
  slug: string;
  title: string;
  category: string;
  productCount: number;
  imageUrl: string;
};

export default function FeaturedGuideRotator({
  guides,
}: {
  guides: FeaturedGuideItem[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeGuide = guides[activeIndex] || guides[0];

  useEffect(() => {
    if (paused || guides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const offset = 1 + Math.floor(Math.random() * (guides.length - 1));
        return (current + offset) % guides.length;
      });
    }, 7000);

    return () => window.clearInterval(timer);
  }, [guides.length, paused]);

  if (!activeGuide) return null;

  return (
    <div
      className="hero-panel-shell"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <Link
        key={activeGuide.slug}
        className="hero-panel"
        href={`/${activeGuide.slug}`}
        aria-label={`Read featured guide: ${activeGuide.title}`}
      >
        {activeGuide.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero-panel-image" src={activeGuide.imageUrl} alt="" />
        )}
        <div className="hero-panel-top">
          <span>Featured guides</span>
          <span>Curated</span>
        </div>
        <div className="hero-panel-content">
          <span>{activeGuide.category}</span>
          <p>{activeGuide.title}</p>
          <small>
            {activeGuide.productCount} product
            {activeGuide.productCount === 1 ? "" : "s"} compared
          </small>
        </div>
        <div className="hero-panel-link">
          Explore this guide <span aria-hidden="true">→</span>
        </div>
      </Link>

      {guides.length > 1 && (
        <div className="hero-panel-dots" aria-label="Choose a featured guide">
          {guides.map((guide, index) => (
            <button
              key={guide.slug}
              type="button"
              aria-label={`Show ${guide.title}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
