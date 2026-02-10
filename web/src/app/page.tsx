"use client";

import Link from "next/link";
import { DM_Serif_Display, Space_Grotesk } from "next/font/google";
import { useI18n } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";

const display = DM_Serif_Display({ subsets: ["latin"], weight: "400" });
const body = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"] });

export default function Home() {
  const { t } = useI18n();
  return (
    <div className={`${body.className} relative min-h-screen overflow-hidden bg-slate-950 text-white`}>
      <style>{`
        @keyframes floatOne {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(20px, -30px, 0) scale(1.04); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes floatTwo {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-30px, 20px, 0) scale(0.98); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes floatThree {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(10px, 25px, 0) scale(1.06); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translate3d(0, 12px, 0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes introFade {
          0% { opacity: 1; }
          65% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes introGradient {
          0% { background-position: 0% 50%; transform: scale(1.05); }
          100% { background-position: 100% 50%; transform: scale(1); }
        }
        @keyframes introSweep {
          0% { transform: translateX(-140%) skewX(-16deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(140%) skewX(-16deg); opacity: 0; }
        }
        @keyframes introRing {
          0% { opacity: 0; transform: scale(0.8); }
          40% { opacity: 0.9; }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes introWord {
          0% { opacity: 0; letter-spacing: 0.6em; transform: translateY(10px); }
          35% { opacity: 1; letter-spacing: 0.28em; }
          80% { opacity: 1; }
          100% { opacity: 0; letter-spacing: 0.35em; transform: translateY(-6px); }
        }
        @keyframes starDrift {
          0% { transform: translate3d(0, 0, 0); opacity: 0.6; }
          50% { opacity: 0.9; }
          100% { transform: translate3d(-6%, -10%, 0); opacity: 0.6; }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes nebulaFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(10px, -20px, 0) scale(1.04); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes dustDrift {
          0% { transform: translate3d(0, 0, 0); opacity: 0.35; }
          100% { transform: translate3d(12%, -8%, 0); opacity: 0.5; }
        }
        .intro-overlay {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: #020617;
          overflow: hidden;
          animation: introFade 2.3s ease forwards;
        }
        .intro-gradient {
          position: absolute;
          inset: -20%;
          background:
            radial-gradient(60% 50% at 50% 40%, rgba(16,185,129,0.45), transparent 60%),
            radial-gradient(40% 35% at 15% 70%, rgba(245,158,11,0.35), transparent 55%),
            radial-gradient(35% 30% at 80% 30%, rgba(45,212,191,0.35), transparent 55%),
            linear-gradient(120deg, rgba(255,255,255,0.08), transparent 50%, rgba(255,255,255,0.06));
          background-size: 200% 200%;
          animation: introGradient 2.2s ease both;
        }
        .intro-sweep {
          position: absolute;
          top: -20%;
          bottom: -20%;
          width: 60%;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.02) 60%, transparent 100%);
          mix-blend-mode: screen;
          animation: introSweep 1.6s ease forwards 0.35s;
        }
        .intro-ring {
          position: absolute;
          width: 240px;
          height: 240px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 0 40px rgba(16,185,129,0.18);
          animation: introRing 2.1s ease both 0.2s;
        }
        .intro-word {
          position: relative;
          text-transform: uppercase;
          letter-spacing: 0.28em;
          font-size: clamp(2.4rem, 6vw, 4rem);
          color: #f8fafc;
          text-shadow: 0 6px 30px rgba(16,185,129,0.25);
          animation: introWord 2.0s ease both 0.1s;
        }
        @media (prefers-reduced-motion: reduce) {
          .intro-overlay,
          .intro-gradient,
          .intro-sweep,
          .intro-ring,
          .intro-word,
          .starfield,
          .starfield-2,
          .cosmic-dust,
          .cosmic-nebula {
            animation: none !important;
            opacity: 0 !important;
          }
        }
        .starfield {
          position: absolute;
          inset: -20%;
          background-image:
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent 55%),
            radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.5), transparent 60%),
            radial-gradient(1px 1px at 40% 60%, rgba(255,255,255,0.4), transparent 55%),
            radial-gradient(1px 1px at 85% 25%, rgba(255,255,255,0.6), transparent 60%),
            radial-gradient(1px 1px at 10% 75%, rgba(255,255,255,0.5), transparent 60%);
          background-size: 220px 220px;
          animation: starDrift 26s linear infinite;
          opacity: 0.65;
        }
        .starfield-2 {
          position: absolute;
          inset: -30%;
          background-image:
            radial-gradient(1.2px 1.2px at 15% 20%, rgba(125,211,252,0.65), transparent 60%),
            radial-gradient(1.4px 1.4px at 55% 35%, rgba(16,185,129,0.55), transparent 60%),
            radial-gradient(1.2px 1.2px at 75% 55%, rgba(245,158,11,0.5), transparent 60%),
            radial-gradient(1px 1px at 30% 85%, rgba(255,255,255,0.5), transparent 60%);
          background-size: 260px 260px;
          animation: starTwinkle 6s ease-in-out infinite;
          opacity: 0.55;
        }
        .cosmic-nebula {
          position: absolute;
          inset: -20%;
          background:
            radial-gradient(60% 45% at 20% 20%, rgba(14,165,233,0.18), transparent 60%),
            radial-gradient(50% 40% at 80% 30%, rgba(16,185,129,0.2), transparent 60%),
            radial-gradient(40% 35% at 30% 80%, rgba(99,102,241,0.18), transparent 60%),
            radial-gradient(30% 30% at 85% 75%, rgba(245,158,11,0.12), transparent 55%);
          filter: blur(2px);
          animation: nebulaFloat 24s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="intro-overlay">
          <div className="intro-gradient" />
          <div className="intro-sweep" />
          <div className="intro-ring" />
          <div className={`intro-word ${display.className}`}>Gopherchat</div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="starfield" />
        <div className="starfield-2" />
        <div className="cosmic-nebula" />
        <div className="absolute inset-0 opacity-50 bg-[linear-gradient(120deg,_rgba(255,255,255,0.05),_transparent_45%,_rgba(255,255,255,0.04))]" />
        <div
          className="absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-emerald-400/25 blur-3xl"
          style={{ animation: "floatOne 18s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-10rem] left-[-6rem] h-[22rem] w-[22rem] rounded-full bg-amber-300/20 blur-3xl"
          style={{ animation: "floatTwo 22s ease-in-out infinite" }}
        />
        <div
          className="absolute top-12 right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-teal-300/15 blur-3xl"
          style={{ animation: "floatThree 20s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_65%)]" />
      </div>

      <header
        className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10"
        style={{ animation: "fadeUp 600ms ease-out both 1.4s" }}
      >
        <div className="text-xs font-medium uppercase tracking-[0.35em] text-emerald-100/70">
          Gopherchat
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle floating={false} />
          <Link
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-emerald-50/90 transition hover:border-white/50 hover:text-white"
            href="/login"
          >
            {t("home.login")}
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center px-6 sm:px-10">
        <div className="text-center">
          <div
            className={`${display.className} text-5xl tracking-tight sm:text-7xl`}
            style={{ animation: "fadeUp 700ms ease-out both 1.6s" }}
          >
            Gopherchat
          </div>
          <p
            className="mx-auto mt-4 max-w-md text-sm text-emerald-50/70 sm:text-base"
            style={{ animation: "fadeUp 900ms ease-out both 1.8s" }}
          >
            {t("home.tagline")}
          </p>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animation: "fadeUp 1100ms ease-out both 2s" }}
          >
            <Link
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/20 transition hover:scale-[1.02] hover:shadow-emerald-300/40"
              href="/login"
            >
              {t("home.startChat")}
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/90 shadow-sm transition hover:border-white/60 hover:text-white"
              href="/demo"
            >
              {t("home.demo")}
            </Link>
          </div>
          <div
            className="mt-6 text-xs uppercase tracking-[0.35em] text-emerald-100/70"
            style={{ animation: "fadeUp 1200ms ease-out both 2.1s" }}
          >
            {t("home.developer")}
          </div>
        </div>
      </main>
    </div>
  );
}
