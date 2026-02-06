"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type RouteTransitionProps = {
  children: React.ReactNode;
};

export default function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);
  const [sweepKey, setSweepKey] = useState(0);
  const durationMs = 900;

  useEffect(() => {
    setAnimating(true);
    setSweepKey((k) => k + 1);
    const t = setTimeout(() => setAnimating(false), durationMs);
    return () => clearTimeout(t);
  }, [pathname, durationMs]);

  return (
    <div className="relative">
      <style>{`
        @keyframes auroraDrift {
          0% { opacity: 0; transform: translate3d(-6%, -8%, 0) scale(1.08); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(6%, 8%, 0) scale(1); }
        }
        @keyframes auroraSpin {
          0% { opacity: 0; transform: rotate(0deg) scale(1.2); }
          35% { opacity: 0.8; }
          100% { opacity: 0; transform: rotate(140deg) scale(1); }
        }
        @keyframes auroraGrain {
          0% { opacity: 0; }
          30% { opacity: 0.2; }
          100% { opacity: 0; }
        }
        .route-aurora {
          position: absolute;
          inset: -30%;
          background:
            radial-gradient(45% 40% at 18% 30%, rgba(16,185,129,0.45), transparent 65%),
            radial-gradient(42% 36% at 78% 22%, rgba(45,212,191,0.35), transparent 62%),
            radial-gradient(46% 42% at 78% 78%, rgba(245,158,11,0.28), transparent 66%),
            radial-gradient(40% 45% at 25% 80%, rgba(34,197,94,0.25), transparent 70%);
          filter: blur(28px) saturate(1.15);
          animation: auroraDrift 900ms ease-in-out both;
        }
        .route-conic {
          position: absolute;
          inset: -35%;
          background: conic-gradient(
            from 210deg at 50% 50%,
            rgba(16,185,129,0.35),
            rgba(45,212,191,0.25),
            rgba(250,204,21,0.22),
            rgba(34,197,94,0.3),
            rgba(16,185,129,0.35)
          );
          filter: blur(40px) saturate(1.2);
          animation: auroraSpin 900ms ease-in-out both;
        }
        .route-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
          opacity: 0;
          transition: opacity 300ms ease;
        }
        .route-overlay[data-active="true"] {
          opacity: 1;
        }
        .route-grain {
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(
              115deg,
              rgba(16,185,129,0.22) 0,
              rgba(16,185,129,0.22) 1px,
              transparent 1px,
              transparent 8px
            );
          mix-blend-mode: soft-light;
          animation: auroraGrain 900ms ease both;
        }
        @media (prefers-reduced-motion: reduce) {
          .route-overlay {
            display: none;
          }
        }
      `}</style>

      <div
        className={`transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          animating ? "opacity-90 blur-[0.4px] scale-[0.992]" : "opacity-100"
        }`}
      >
        {children}
      </div>

      <div className="route-overlay" data-active={animating ? "true" : "false"}>
        <div key={sweepKey} className="route-aurora" />
        <div key={`${sweepKey}-conic`} className="route-conic" />
        <div className="route-grain" />
      </div>
    </div>
  );
}
