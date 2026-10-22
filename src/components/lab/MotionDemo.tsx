import { useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';

/**
 * Motion (Framer Motion) probe for the cinematic-invite spike.
 *
 * Covers the three things we need to judge:
 *   1. scroll-triggered sequence  — whileInView + staggered children
 *   2. tap-triggered transition   — AnimatePresence swap
 *   3. branching choice point     — guest's pick changes what renders next
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── 1. Scroll-triggered sequence ─────────────────────────────── */

const stagger = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const rise = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE },
  },
};

export function ScrollSequence() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Scroll-linked (not just triggered): the rule scrubs as the section passes.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.9', 'center 0.5'],
  });
  const ruleWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <motion.div
      ref={ref}
      variants={reduce ? undefined : stagger}
      initial={reduce ? undefined : 'hidden'}
      whileInView={reduce ? undefined : 'shown'}
      viewport={{ once: true, amount: 0.35 }}
    >
      <motion.p variants={rise} className="lab-eyebrow">
        Scroll-triggered
      </motion.p>
      <motion.h2 variants={rise} className="lab-h">
        Bismillah
      </motion.h2>

      <motion.div
        style={{ width: reduce ? '100%' : ruleWidth }}
        className="mt-4 h-px"
        // Scrubs with scroll position rather than firing once.
      >
        <div className="h-px w-full" style={{ background: 'var(--dc-gold)' }} />
      </motion.div>

      <motion.p variants={rise} className="lab-p">
        Each line fades, rises and settles on a 120&nbsp;ms stagger. The gold rule
        above is scroll-<em>linked</em> — it tracks scroll position frame by frame
        rather than firing once on entry.
      </motion.p>

      <motion.div variants={rise} className="lab-card mt-6">
        <p className="lab-p" style={{ marginTop: 0 }}>
          Motion only animates <code>transform</code> and <code>opacity</code> here,
          so the compositor does the work and the main thread stays free.
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ── 2. Tap-triggered transition ──────────────────────────────── */

const FACES = [
  { k: 'akad', label: 'Akad Nikah', time: '10:00 pagi', note: 'Masjid Jamek Temerloh' },
  { k: 'resepsi', label: 'Resepsi', time: '7:00 malam', note: 'Elegant Glam Hall' },
];

export function TapTransition() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const face = FACES[i]!;

  return (
    <div>
      <p className="lab-eyebrow">Tap-triggered</p>
      <h2 className="lab-h">Dua majlis</h2>

      <div className="lab-card mt-6" style={{ minHeight: 168 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={face.k}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.34, ease: EASE }}
          >
            <p className="lab-eyebrow">{face.label}</p>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 34,
                color: 'var(--dc-ink-strong)',
                marginTop: 6,
              }}
            >
              {face.time}
            </p>
            <p className="lab-p" style={{ marginTop: 4 }}>
              {face.note}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        className="btn mt-5 w-full"
        whileTap={reduce ? undefined : { scale: 0.97 }}
        onClick={() => setI((p) => (p + 1) % FACES.length)}
      >
        Tukar majlis
      </motion.button>
      <p className="lab-p" style={{ fontSize: 13 }}>
        <code>AnimatePresence mode="wait"</code> holds the exit animation before
        mounting the next card, so the two never overlap. <code>whileTap</code>
        gives the press its own spring without any extra state.
      </p>
    </div>
  );
}

/* ── 3. Branching choice point ────────────────────────────────── */

type Branch = 'memandu' | 'bas' | null;

const BRANCHES: Record<
  Exclude<Branch, null>,
  { title: string; lines: string[] }
> = {
  memandu: {
    title: 'Memandu',
    lines: [
      'KL → Karak → LPT, keluar Temerloh. Lebih kurang 2 jam.',
      'Parkir percuma di belakang dewan, ruang untuk 80 kereta.',
      'Waze: “Elegant Glam Hall Temerloh”.',
    ],
  },
  bas: {
    title: 'Menaiki bas',
    lines: [
      'TBS → Terminal Temerloh, tiap 2 jam bermula 7:00 pagi.',
      'Dari terminal, Grab ke dewan lebih kurang 10 minit.',
      'Beritahu kami — kami boleh aturkan jemputan.',
    ],
  },
};

export function BranchPoint() {
  const reduce = useReducedMotion();
  const [pick, setPick] = useState<Branch>(null);
  const chosen = pick ? BRANCHES[pick] : null;

  return (
    <div>
      <p className="lab-eyebrow">Branching</p>
      <h2 className="lab-h">Bagaimana anda ke sana?</h2>
      <p className="lab-p">
        The pick below changes what renders next — the real test for a guest-driven
        invite.
      </p>

      <div className="mt-5 flex gap-3">
        {(['memandu', 'bas'] as const).map((k) => {
          const active = pick === k;
          return (
            <motion.button
              key={k}
              type="button"
              onClick={() => setPick(k)}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              animate={
                reduce ? undefined : { scale: active ? 1.02 : 1 }
              }
              transition={{ duration: 0.25, ease: EASE }}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 14,
                border: `1px solid ${active ? 'transparent' : 'var(--dc-gold-soft)'}`,
                background: active ? 'var(--dc-btn)' : 'transparent',
                color: active ? 'var(--dc-btn-text)' : 'var(--dc-gold-deep)',
              }}
            >
              {BRANCHES[k].title}
            </motion.button>
          );
        })}
      </div>

      {/* popLayout lets the outgoing branch leave while the incoming one
          takes its place, so swapping between branches doesn't jump height. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {chosen && (
          <motion.div
            key={pick}
            layout
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="lab-card mt-5"
          >
            <motion.ul
              variants={reduce ? undefined : stagger}
              initial={reduce ? undefined : 'hidden'}
              animate={reduce ? undefined : 'shown'}
              style={{ display: 'grid', gap: 12 }}
            >
              {chosen.lines.map((line) => (
                <motion.li
                  key={line}
                  variants={rise}
                  className="lab-p"
                  style={{ marginTop: 0, display: 'flex', gap: 10 }}
                >
                  <span style={{ color: 'var(--dc-gold)' }}>◆</span>
                  <span>{line}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>

      {!chosen && (
        <p className="lab-p" style={{ fontSize: 13 }}>
          Nothing rendered yet — pick one.
        </p>
      )}
    </div>
  );
}
