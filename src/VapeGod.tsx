import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────
   Types & constants
───────────────────────────────────────── */
type Phase = "idle" | "playing" | "caught" | "blinker" | "greenedout" | "cloud" | "vapegod" | "certified";

interface RewardResult {
  awarded: boolean;
  seedsAwarded: number;
  newBalance: number;
  alreadyClaimed: boolean;
  message: string;
}

const DANGER_POS_NORMAL  = 48;
const CATCH_POS_NORMAL   = 50;
const DANGER_POS_GREENED = 68;
const CATCH_POS_GREENED  = 70;
const FILL_SAFE  = 3400;
const FILL_MID   = 5500;
const DRAIN_RATE = 26;
const CLOUD_MS   = 2200;
const WIN_WINDOW = 120_000;
const BLINKERS_NORMAL  = 3;
const BLINKERS_GREENED = 5;

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export function VapeGod() {
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [progress,     setProgress]     = useState(0);
  const [teacherPos,   setTeacherPos]   = useState(0);
  const [teacherDir,   setTeacherDir]   = useState<"left"|"right">("right");
  const [isDanger,     setIsDanger]     = useState(false);
  const [holding,      setHolding]      = useState(false);
  const [blinkerCount, setBlinkerCount] = useState(0);
  const [blinkerTimes, setBlinkerTimes] = useState<number[]>([]);
  const [timeLeft,     setTimeLeft]     = useState(120);
  const [cloudVisible, setCloudVisible] = useState(false);
  const [vapeVisible,  setVapeVisible]  = useState(false);
  const [greenedOut,   setGreenedOut]   = useState(false);
  const [score,        setScore]        = useState(0);
  const [airdropCode,  setAirdropCode]  = useState("");
  const [sessionId,    setSessionId]    = useState("");
  const [reward,       setReward]       = useState<RewardResult | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);

  const holdRef          = useRef(false);
  const progressRef      = useRef(0);
  const teacherPosRef    = useRef(0);
  const teacherTargetRef = useRef(0);
  const teacherSpeedRef  = useRef(0);
  const isDangerRef      = useRef(false);
  const phaseRef         = useRef<Phase>("idle");
  const greenedOutRef    = useRef(false);
  const neverReleasedRef = useRef(true);

  const fillFrameRef  = useRef<number | undefined>(undefined);
  const drainFrameRef = useRef<number | undefined>(undefined);
  const moveFrameRef  = useRef<number | undefined>(undefined);
  const scheduleRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clockRef      = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fillTRef  = useRef(0);
  const drainTRef = useRef(0);
  const moveTRef  = useRef(0);

  const scheduleNextMoveRef = useRef<() => void>(() => {});
  const smokeAlertRef = useRef(false);
  const sessionSeedRef    = useRef(0);
  const blinkerBonusesRef = useRef<number[]>([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Read potify_session_id from localStorage (shared with $POTIFY site)
  useEffect(() => {
    let sid = localStorage.getItem("potify_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("potify_session_id", sid);
    }
    setSessionId(sid);
  }, []);

  // Practice only: no browser-computed score can award real community points.

  const dangerPos = () => greenedOutRef.current ? DANGER_POS_GREENED : DANGER_POS_NORMAL;
  const catchPos  = () => greenedOutRef.current ? CATCH_POS_GREENED  : CATCH_POS_NORMAL;

  const moveTeacher = useCallback((ts: number) => {
    if (!moveTRef.current) moveTRef.current = ts;
    const dt = ts - moveTRef.current;
    moveTRef.current = ts;

    const cur    = teacherPosRef.current;
    const target = teacherTargetRef.current;
    const speed  = teacherSpeedRef.current;
    const dir    = target > cur ? 1 : -1;
    const step   = speed * (dt / 1000);
    const next   = dir > 0 ? Math.min(cur + step, target) : Math.max(cur - step, target);

    teacherPosRef.current = next;
    setTeacherPos(next);

    const dp = greenedOutRef.current ? DANGER_POS_GREENED : DANGER_POS_NORMAL;
    const nowDanger = next >= dp;
    if (nowDanger !== isDangerRef.current) {
      isDangerRef.current = nowDanger;
      setIsDanger(nowDanger);
    }

    const cp = greenedOutRef.current ? CATCH_POS_GREENED : CATCH_POS_NORMAL;
    if (holdRef.current && next >= cp && phaseRef.current === "playing") {
      holdRef.current = false;
      setHolding(false);
      setVapeVisible(false);
      cancelAnimationFrame(fillFrameRef.current!);
      cancelAnimationFrame(drainFrameRef.current!);
      phaseRef.current = "caught";
      setPhase("caught");
      return;
    }

    if (Math.abs(next - target) < 0.3) {
      teacherPosRef.current = target;
      setTeacherPos(target);
      moveTRef.current = 0;
      return;
    }
    moveFrameRef.current = requestAnimationFrame(moveTeacher);
  }, []);

  const scheduleNextMove = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const cur = teacherPosRef.current;
    const r   = Math.random();
    let newTarget: number;
    let speed:    number;
    let delay:    number;

    if (smokeAlertRef.current && greenedOutRef.current) {
      smokeAlertRef.current = false;
      delay = 300 + r * 400;
      newTarget = 75 + Math.random() * 25;
      speed = 18 + Math.random() * 8;
      setTeacherDir("left");
      scheduleRef.current = setTimeout(() => {
        if (phaseRef.current !== "playing") return;
        teacherTargetRef.current = newTarget;
        teacherSpeedRef.current  = speed;
        moveTRef.current = 0;
        cancelAnimationFrame(moveFrameRef.current!);
        moveFrameRef.current = requestAnimationFrame(moveTeacher);
        scheduleNextMove();
      }, delay);
      return;
    }

    if (cur < 15) {
      delay = 700 + r * 1600;
      if (r < 0.60) {
        newTarget = 65 + Math.random() * 35;
        speed = 14 + Math.random() * 10;
      } else if (r < 0.85) {
        newTarget = 30 + Math.random() * 30;
        speed = 12 + Math.random() * 8;
      } else {
        newTarget = 5 + Math.random() * 12;
        speed = 9;
      }
    } else if (cur < 50) {
      delay = 400 + r * 900;
      if (r < 0.55) {
        newTarget = 70 + Math.random() * 30;
        speed = 15 + Math.random() * 11;
      } else if (r < 0.90) {
        newTarget = Math.random() * 12;
        speed = 14 + Math.random() * 10;
      } else {
        newTarget = 35 + Math.random() * 20;
        speed = 11;
      }
    } else {
      delay = 300 + r * 800;
      if (r < 0.50) {
        newTarget = Math.random() * 18;
        speed = 16 + Math.random() * 10;
      } else {
        newTarget = 55 + Math.random() * 45;
        speed = 11 + Math.random() * 8;
      }
    }

    setTeacherDir(newTarget > cur ? "left" : "right");

    scheduleRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      teacherTargetRef.current = newTarget;
      teacherSpeedRef.current  = speed;
      moveTRef.current = 0;
      cancelAnimationFrame(moveFrameRef.current!);
      moveFrameRef.current = requestAnimationFrame(moveTeacher);
      scheduleNextMove();
    }, delay);
  }, [moveTeacher]);

  useEffect(() => { scheduleNextMoveRef.current = scheduleNextMove; }, [scheduleNextMove]);

  const triggerBlinker = useCallback((wasGreenedOut: boolean) => {
    cancelAnimationFrame(fillFrameRef.current!);
    cancelAnimationFrame(drainFrameRef.current!);

    const resumePlaying = () => {
      progressRef.current = 0;
      setProgress(0);
      phaseRef.current = "playing";
      setPhase("playing");
      scheduleNextMoveRef.current();
    };

    if (wasGreenedOut && !greenedOutRef.current) {
      greenedOutRef.current = true;
      setGreenedOut(true);
      phaseRef.current = "greenedout";
      setPhase("greenedout");
      setTimeout(() => {
        phaseRef.current = "cloud";
        setPhase("cloud");
        setCloudVisible(true);
        setTimeout(() => {
          setCloudVisible(false);
          setTimeout(resumePlaying, 600);
        }, CLOUD_MS);
      }, 2200);
      return;
    }

    phaseRef.current = "blinker";
    setPhase("blinker");
    const winCount = greenedOutRef.current ? BLINKERS_GREENED : BLINKERS_NORMAL;

    const thisBlinkerBonus = 4.2 + Math.random() * 9.6;
    blinkerBonusesRef.current = [...blinkerBonusesRef.current, thisBlinkerBonus];
    const bonusSum   = blinkerBonusesRef.current.reduce((a, b) => a + b, 0);
    const greenBonus = greenedOutRef.current ? 8.5 : 0;
    const rawScore   = Math.min(99.99, sessionSeedRef.current + bonusSum + greenBonus);
    const finalScore = Math.round(rawScore * 100) / 100;
    setScore(finalScore);

    const now = Date.now();
    setBlinkerTimes(prev => {
      const updated = [...prev.filter(t => now - t < WIN_WINDOW), now];
      if (updated.length >= winCount) {
        setBlinkerCount(updated.length);
        const endPhase: Phase = greenedOutRef.current ? "certified" : "vapegod";
        setTimeout(() => { phaseRef.current = endPhase; setPhase(endPhase); }, 1500);
      } else {
        setBlinkerCount(updated.length);
        if (greenedOutRef.current && updated.length >= 2) {
          smokeAlertRef.current = true;
        }
        setTimeout(() => {
          phaseRef.current = "cloud";
          setPhase("cloud");
          setCloudVisible(true);
          setTimeout(() => {
            setCloudVisible(false);
            setTimeout(resumePlaying, 600);
          }, CLOUD_MS);
        }, 950);
      }
      return updated;
    });
  }, []);

  const animateFill = useCallback((ts: number) => {
    if (!holdRef.current) return;
    if (!fillTRef.current) fillTRef.current = ts;
    const dt = ts - fillTRef.current;
    fillTRef.current = ts;

    const tPos = teacherPosRef.current;
    const dp   = greenedOutRef.current ? DANGER_POS_GREENED : DANGER_POS_NORMAL;
    const t    = tPos < dp
      ? FILL_SAFE + (FILL_MID - FILL_SAFE) * (tPos / dp)
      : FILL_MID;

    const next = Math.min(progressRef.current + (dt / t) * 100, 100);
    progressRef.current = next;
    setProgress(next);

    if (next >= 100) {
      const continuous = neverReleasedRef.current;
      holdRef.current = false;
      setHolding(false);
      setVapeVisible(false);
      fillTRef.current = 0;
      triggerBlinker(continuous);
      return;
    }
    fillFrameRef.current = requestAnimationFrame(animateFill);
  }, [triggerBlinker]);

  const animateDrain = useCallback((ts: number) => {
    if (holdRef.current) return;
    if (!drainTRef.current) drainTRef.current = ts;
    const dt = ts - drainTRef.current;
    drainTRef.current = ts;

    const cur    = progressRef.current;
    const target = cur > 66 ? 66 : cur > 33 ? 33 : 0;
    if (cur <= target + 0.1) { drainTRef.current = 0; return; }

    const next = Math.max(cur - DRAIN_RATE * (dt / 1000), target);
    progressRef.current = next;
    setProgress(next);

    if (next > target) drainFrameRef.current = requestAnimationFrame(animateDrain);
    else drainTRef.current = 0;
  }, []);

  const stopAll = useCallback(() => {
    holdRef.current = false;
    cancelAnimationFrame(fillFrameRef.current!);
    cancelAnimationFrame(drainFrameRef.current!);
    cancelAnimationFrame(moveFrameRef.current!);
    clearTimeout(scheduleRef.current);
    clearInterval(clockRef.current);
    fillTRef.current = drainTRef.current = moveTRef.current = 0;
    isDangerRef.current = false;
  }, []);

  const startGame = useCallback(() => {
    stopAll();
    progressRef.current = 0;
    teacherPosRef.current = 0;
    teacherTargetRef.current = 0;
    greenedOutRef.current = false;
    neverReleasedRef.current = true;
    sessionSeedRef.current    = 18.5 + Math.random() * 43.3;
    blinkerBonusesRef.current = [];
    setScore(Math.round(sessionSeedRef.current * 100) / 100);
    setAirdropCode("");
    setProgress(0);
    setTeacherPos(0);
    setTeacherDir("right");
    setIsDanger(false);
    setHolding(false);
    setGreenedOut(false);
    setBlinkerCount(0);
    setBlinkerTimes([]);
    setTimeLeft(120);
    setCloudVisible(false);
    setVapeVisible(false);
    phaseRef.current = "playing";
    setPhase("playing");

    clockRef.current = setInterval(() =>
      setTimeLeft(t => {
        if (t <= 1) { phaseRef.current = "idle"; setPhase("idle"); return 120; }
        return t - 1;
      }), 1000);

    setTimeout(scheduleNextMove, 800);
  }, [stopAll, scheduleNextMove]);

  const reset = useCallback(() => {
    stopAll();
    progressRef.current = 0;
    teacherPosRef.current = 0;
    greenedOutRef.current = false;
    isDangerRef.current = false;
    sessionSeedRef.current = 0;
    blinkerBonusesRef.current = [];
    setScore(0);
    setAirdropCode("");
    setReward(null);
    setRewardLoading(false);
    setProgress(0);
    setTeacherPos(0);
    setTeacherDir("right");
    setIsDanger(false);
    setHolding(false);
    setGreenedOut(false);
    setBlinkerCount(0);
    setBlinkerTimes([]);
    setTimeLeft(120);
    setCloudVisible(false);
    setVapeVisible(false);
    phaseRef.current = "idle";
    setPhase("idle");
  }, [stopAll]);

  const onDown = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    if (isDangerRef.current) {
      stopAll();
      phaseRef.current = "caught";
      setPhase("caught");
      return;
    }
    cancelAnimationFrame(drainFrameRef.current!);
    drainTRef.current = 0;
    if (progressRef.current < 2) neverReleasedRef.current = true;
    holdRef.current = true;
    fillTRef.current = 0;
    setHolding(true);
    setVapeVisible(true);
    fillFrameRef.current = requestAnimationFrame(animateFill);
  }, [stopAll, animateFill]);

  const onUp = useCallback(() => {
    if (!holdRef.current) return;
    holdRef.current = false;
    neverReleasedRef.current = false;
    cancelAnimationFrame(fillFrameRef.current!);
    fillTRef.current = 0;
    setHolding(false);
    setVapeVisible(false);
    drainTRef.current = 0;
    drainFrameRef.current = requestAnimationFrame(animateDrain);
  }, [animateDrain]);

  useEffect(() => () => stopAll(), [stopAll]);

  const pct      = progress;
  const barColor = pct < 40 ? "#4ade80" : pct < 75 ? "#facc15" : "#f97316";
  const playing  = phase === "playing" || phase === "cloud";
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const winCount = greenedOut ? BLINKERS_GREENED : BLINKERS_NORMAL;

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      userSelect: "none", WebkitUserSelect: "none", touchAction: "none",
      fontFamily: "system-ui, sans-serif", background: "#1a1a2e",
    }}>

      {/* ── Persistent Top Nav ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, minHeight: 48,
        background: "rgba(8,8,20,0.94)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexWrap: "wrap", gap: "0 8px", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", zIndex: 50,
        touchAction: "auto", pointerEvents: "auto",
      }}>
        <a
          href="/"
          style={{
            color: "#7c9cfc", fontSize: 11, letterSpacing: 1, minHeight: 44, display: "inline-flex", alignItems: "center",
            textDecoration: "none", fontWeight: 700,
            fontFamily: "system-ui, sans-serif", touchAction: "auto",
          }}
        >
          ← POTIFY HOME
        </a>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a
            href="https://potify-launch-room.wile-e-coyot.chatgpt.site/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#A78B4B", fontSize: 10, letterSpacing: 0.5, minHeight: 44, display: "inline-flex", alignItems: "center",
              textDecoration: "none", fontFamily: "system-ui, sans-serif",
              touchAction: "auto",
            }}
          >
            LAUNCH ROOM ↗
          </a>
          <a
            href="/green-light-pay"
            aria-label="Green Light Pay separation notice"
            style={{
              color: "#ffffffaa", fontSize: 10, letterSpacing: 0.5, minHeight: 44, display: "inline-flex", alignItems: "center",
              textDecoration: "none", fontFamily: "system-ui, sans-serif",
              touchAction: "auto",
            }}
          >
            GLP BOUNDARY
          </a>
        </div>
      </div>

      {/* ── Scene ── */}
      <svg viewBox="0 0 1280 780" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <ClassroomBg />

        {greenedOut && (
          <>
            <text
              x="548" y="282"
              textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontSize="19"
              fill="rgba(242,242,218,0.72)"
              letterSpacing="1.5"
              style={{ filter: "blur(0.35px)" }}
            >
              seed → soil → Solana 🚀
            </text>
            <line x1="290" y1="290" x2="808" y2="290"
              stroke="rgba(242,242,218,0.22)" strokeWidth="1.2" strokeDasharray="4 6" />
            <rect x="1012" y="216" width="216" height="22" fill="#fffdf5" />
            <text
              x="1120" y="230"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="9.5"
              fill="#8a7000"
              opacity="0.88"
              letterSpacing="0.3"
            >
              SEED · SOIL · SOLANA
            </text>
          </>
        )}

        {(playing || phase === "blinker" || phase === "greenedout" || phase === "idle") && (
          <TeacherFigure pos={teacherPos} facingStudent={teacherDir === "left"} isDanger={isDanger} />
        )}

        <StudentFigure
          holding={holding}
          vapeVisible={vapeVisible}
          isDanger={isDanger}
          greenedOut={greenedOut}
          playing={playing || phase === "blinker" || phase === "greenedout" || phase === "idle"}
        />

        {(holding || cloudVisible) && <SmokeCloud big={cloudVisible} />}

        {greenedOut && playing && <GreenHaze />}

        {isDanger && playing && (
          <rect x="0" y="0" width="1280" height="780"
            fill="rgba(180,20,20,0.12)"
            style={{ animation: "dangerFlicker 0.45s ease-in-out infinite alternate" }} />
        )}
      </svg>

      {/* ── HUD ── */}
      {(playing || phase === "blinker" || phase === "greenedout") && (
        <div style={{
          position: "absolute", top: 100, right: 12, maxWidth: "calc(100% - 24px)", boxSizing: "border-box",
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
          background: greenedOut ? "rgba(20,10,0,0.92)" : "rgba(15,15,30,0.88)",
          padding: "8px 18px", borderRadius: 12,
          border: `1px solid ${greenedOut ? "rgba(255,140,0,0.4)" : "rgba(100,120,200,0.25)"}`,
          zIndex: 10,
        }}>
          <span style={{ color: "#ffffffcc", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {mm}:{ss}
          </span>
          {greenedOut && <span style={{ fontSize: 11, color: "#fb923c", fontWeight: 800 }}>🌿 GREENED</span>}
          <span style={{ fontSize: 16, letterSpacing: 2 }}>
            {"🍃".repeat(blinkerCount)}{"◻️".repeat(Math.max(0, winCount - blinkerCount))}
          </span>
          {score > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums",
              color: score > 85.56 ? "#4ade80" : score > 60 ? "#facc15" : "#94a3b8",
              letterSpacing: 0.5,
              textShadow: score > 85.56 ? "0 0 8px #4ade8088" : "none",
            }}>
              {score.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div className="vape-controls" style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(8,8,24,0.98) 60%, transparent)",
        padding: "32px 0 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        zIndex: 10,
      }}>
        {phase === "idle" && (
          <>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#7c9cfc", letterSpacing: 3 }}>$POTIFY</span>
            <p style={{ margin: 0, color: "#ffffff44", fontSize: 12, letterSpacing: 1 }}>
              Watch the teacher. Don't get caught.
            </p>
            <button onClick={startGame} style={btnStyle("#3b5bdb","#2f4ac0","#fff")}>
              🎒 Start Class
            </button>
            <a href="/" style={{ color: "#ffffffaa", fontSize: 11, letterSpacing: 1, marginTop: 4, textDecoration: "none", fontFamily: "system-ui, sans-serif" }}>
              ← potifywebsite.com
            </a>
          </>
        )}

        {playing && (
          <>
            <div style={{ width: "100%", maxWidth: 480, padding: "0 24px", boxSizing: "border-box" }}>
              <div style={{
                width: "100%", height: 24,
                background: "rgba(0,0,0,0.5)", borderRadius: 12,
                border: `1.5px solid ${isDanger ? "rgba(220,50,50,0.5)" : greenedOut ? "rgba(255,140,0,0.3)" : "rgba(100,130,255,0.2)"}`,
                overflow: "visible", position: "relative",
                transition: "border-color 0.3s",
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: greenedOut
                    ? `linear-gradient(90deg, #fb923c, ${barColor})`
                    : `linear-gradient(90deg, #4ade80, ${barColor})`,
                  borderRadius: 12,
                  transition: "width 0.04s linear, background 0.3s",
                  boxShadow: pct > 65 ? `0 0 14px ${barColor}99` : undefined,
                }} />
                {[33, 66].map(c => (
                  <div key={c} style={{
                    position: "absolute", top: -10, left: `${c}%`,
                    transform: "translateX(-50%)", fontSize: 15, pointerEvents: "none",
                    filter: pct >= c ? "drop-shadow(0 0 4px #4ade80)" : "grayscale(0.9) brightness(0.4)",
                    transition: "filter 0.3s",
                  }}>🍃</div>
                ))}
              </div>
            </div>

            <button
              onPointerDown={onDown}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              style={{
                ...btnStyle(
                  isDanger ? "#2a0a0a" : holding ? "#166534" : greenedOut ? "#78350f" : "#1d4ed8",
                  isDanger ? "#1a0606" : holding ? "#14532d" : greenedOut ? "#92400e" : "#1e40af",
                  isDanger ? "#cc3333" : "#fff"
                ),
                border: isDanger ? "2px solid #991b1b" : "none",
                cursor: isDanger ? "not-allowed" : "pointer",
                transform: holding ? "scale(0.93)" : "scale(1)",
                boxShadow: isDanger ? "0 0 20px rgba(200,0,0,0.25)" : "0 6px 28px rgba(29,78,216,0.35)",
                touchAction: "none",
              minWidth: "min(280px, 82vw)",
              minHeight: 60,
              fontSize: "clamp(16px, 4.5vw, 18px)",
              }}
            >
              {isDanger ? "🚫 She's close!" : holding ? "🌬 Hitting…" : greenedOut ? "🌿 Hold to Hit" : "🎒 Hold to Hit"}
            </button>

            {isDanger && (
              <div style={{ color: "#f87171", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                Teacher is nearby — put it away!
              </div>
            )}
            {greenedOut && !isDanger && (
              <div style={{ color: "#fb923c", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                🌿 GREENED OUT — {winCount} blinkers for $POTIFY CERTIFIED
              </div>
            )}
          </>
        )}
      </div>

      {/* ── OVERLAYS ── */}

      {phase === "blinker" && (
        <Modal>
          <div style={{ fontSize: 52 }}>🍃</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#4ade80", letterSpacing: 4, textShadow: "0 0 20px #4ade80", marginTop: 8 }}>
            BLINKER
          </div>
          <div style={{ color: "#86efac", fontSize: 14, fontWeight: 700, marginTop: 6 }}>
            {"🍃".repeat(blinkerCount)}{"◻️".repeat(Math.max(0, winCount - blinkerCount))}
          </div>
        </Modal>
      )}

      {phase === "greenedout" && (
        <Modal>
          <div style={{ fontSize: 62, animation: "spinPop 0.8s ease-out" }}>🌿</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#fb923c", letterSpacing: 4,
            textShadow: "0 0 28px #fb923c, 0 0 56px #fb923c66", marginTop: 10 }}>
            GREENED OUT
          </div>
          <div style={{ fontSize: 13, color: "#fed7aa", fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>
            Entire blinker in one hit!<br/>
            <span style={{ color: "#fbbf24" }}>You're crouched — teacher has to be way closer to catch you.</span>
          </div>
          <div style={{ color: "#fb923c", fontSize: 12, fontWeight: 800, marginTop: 10, letterSpacing: 1 }}>
            NEW GOAL: 5 BLINKERS → $POTIFY CERTIFIED
          </div>
        </Modal>
      )}

      {phase === "caught" && (
        <Modal light>
          <div style={{ fontSize: 52 }}>😬</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#dc2626", letterSpacing: 1, marginTop: 8 }}>BUSTED!</div>
          <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>Teacher caught you.</div>
          <button onClick={reset} style={{ ...btnStyle("#dc2626","#b91c1c","#fff"), marginTop: 20 }}>
            Try Again
          </button>
        </Modal>
      )}

      {phase === "vapegod" && (
        <Modal>
          <div style={{ fontSize: 62, animation: "float 1.8s ease-in-out infinite" }}>🍃</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#4ade80", letterSpacing: 5,
            textShadow: "0 0 30px #4ade80, 0 0 60px #4ade8066", marginTop: 10 }}>
            WEED GOD
          </div>
          <div style={{ fontSize: 12, color: "#86efac", fontWeight: 600, letterSpacing: 2, marginTop: 10 }}>
            3 BLINKERS · CERTIFIED 🍃
          </div>
          <div style={{ marginTop: 14, padding: "8px 24px", background: "rgba(0,0,0,0.35)", borderRadius: 8, border: "1px solid rgba(74,222,128,0.2)" }}>
            <span style={{ fontSize: 11, color: "#86efac", letterSpacing: 1 }}>SCORE  </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#4ade80", fontVariantNumeric: "tabular-nums",
              textShadow: score >= 96 ? "0 0 12px #4ade80" : "none" }}>
              {score.toFixed(2)}%
            </span>
          </div>
          <SeedReward score={score} reward={reward} loading={rewardLoading} />
          {score < 96 && (
            <div style={{ fontSize: 11, color: "#4ade8099", marginTop: 8 }}>
              Hint: hit an entire blinker without releasing for something special…
            </div>
          )}
          <button onClick={reset} style={{ ...btnStyle("#1d4ed8","#1e40af","#fff"), marginTop: 16 }}>
            Play Again
          </button>
          <a href="/" style={{ color: "#4ade8055", fontSize: 11, letterSpacing: 1, marginTop: 8, textDecoration: "none", fontFamily: "system-ui, sans-serif" }}>
            ← potifywebsite.com
          </a>
        </Modal>
      )}

      {phase === "certified" && (
        <Modal>
          <div style={{ fontSize: 62, animation: "float 1.8s ease-in-out infinite" }}>🌿</div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 4, marginTop: 8,
            background: "linear-gradient(90deg, #fb923c, #fbbf24, #4ade80)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 18px #fb923c)",
          }}>
            $POTIFY CERTIFIED
          </div>
          <div style={{ fontSize: 13, color: "#fed7aa", fontWeight: 600, marginTop: 10, lineHeight: 1.6 }}>
            5 blinkers. Greened out. Certified legend.
          </div>
          <div style={{ fontSize: 20, marginTop: 6 }}>🏆🌿🏆</div>
          <div style={{ marginTop: 12, padding: "8px 24px", background: "rgba(0,0,0,0.35)", borderRadius: 8,
            border: "1px solid rgba(251,146,60,0.3)" }}>
            <span style={{ fontSize: 11, color: "#fed7aa", letterSpacing: 1 }}>SCORE  </span>
            <span style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: "tabular-nums",
              background: "linear-gradient(90deg, #fb923c, #4ade80)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: score >= 96 ? "drop-shadow(0 0 8px #fb923c)" : "none" }}>
              {score.toFixed(2)}%
            </span>
          </div>
          <SeedReward score={score} reward={reward} loading={rewardLoading} accent="#fb923c" />
          <button onClick={reset} style={{ ...btnStyle("#78350f","#92400e","#fff"), marginTop: 16 }}>
            Play Again
          </button>
          <a href="/" style={{ color: "#fb923c55", fontSize: 11, letterSpacing: 1, marginTop: 8, textDecoration: "none", fontFamily: "system-ui, sans-serif" }}>
            ← potifywebsite.com
          </a>
        </Modal>
      )}

      <style>{STYLES}</style>
    </div>
  );
}

/* ─────────────────────────────────────────
   SVG Classroom background
───────────────────────────────────────── */
function ClassroomBg() {
  return (
    <g>
      <rect x="0" y="580" width="1280" height="200" fill="#c8a96a" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={i*130} y1="580" x2={i*130} y2="780" stroke="#b8974a" strokeWidth="1.5" opacity="0.6" />
      ))}
      <line x1="0" y1="580" x2="1280" y2="580" stroke="#a07838" strokeWidth="3" />
      <rect x="0" y="0" width="1280" height="580" fill="#f5e8c8" />
      <rect x="0" y="390" width="1280" height="8" fill="#ddd0a8" />
      <rect x="120" y="30" width="860" height="320" rx="6" fill="#4a3010" />
      <rect x="132" y="42" width="836" height="296" rx="3" fill="#1c3818" />
      <rect x="120" y="350" width="860" height="16" rx="0" fill="#6a4010" />
      <rect x="260" y="352" width="32" height="10" rx="4" fill="#e8e4d2" />
      <rect x="300" y="353" width="24" height="9" rx="4" fill="#e0d4d4" />
      <text x="200" y="130" fontFamily="Georgia, serif" fontSize="52" fill="rgba(220,220,200,0.88)" fontWeight="bold" letterSpacing="2">PHOTOSYNTHESIS</text>
      <line x1="190" y1="148" x2="800" y2="148" stroke="rgba(200,200,180,0.55)" strokeWidth="2.5" />
      <text x="190" y="210" fontFamily="Georgia, serif" fontSize="28" fill="rgba(210,210,190,0.78)">6CO₂ + 6H₂O + light  →  C₆H₁₂O₆ + 6O₂</text>
      <circle cx="60" cy="70" r="48" fill="#f8f7ee" stroke="#888" strokeWidth="3.5" />
      <circle cx="60" cy="70" r="44" fill="#F5F4EC" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i*30-90)*Math.PI/180;
        return <line key={i} x1={60+37*Math.cos(a)} y1={70+37*Math.sin(a)} x2={60+(i%3===0?28:33)*Math.cos(a)} y2={70+(i%3===0?28:33)*Math.sin(a)} stroke="#555" strokeWidth={i%3===0?2.5:1.5}/>;
      })}
      <line x1="60" y1="70" x2="60" y2="38" stroke="#222" strokeWidth="3" strokeLinecap="round" style={{transformOrigin:"60px 70px",animation:"rotMin 3600s linear infinite"}}/>
      <line x1="60" y1="70" x2="78" y2="70" stroke="#333" strokeWidth="4" strokeLinecap="round" style={{transformOrigin:"60px 70px",animation:"rotHr 43200s linear infinite"}}/>
      <circle cx="60" cy="70" r="5" fill="#333" />
      <rect x="1000" y="60" width="240" height="200" rx="6" fill="#fff9f0" stroke="#d4c080" strokeWidth="2.5" />
      <rect x="1010" y="70" width="220" height="180" rx="4" fill="#fffdf5" stroke="#e0cc90" strokeWidth="1.5" />
      <text x="1120" y="130" textAnchor="middle" fontSize="28" fontWeight="900" fill="#b89000" fontFamily="Georgia, serif">DREAM</text>
      <text x="1120" y="168" textAnchor="middle" fontSize="28" fontWeight="900" fill="#b89000" fontFamily="Georgia, serif">BIG!</text>
      <text x="1120" y="228" textAnchor="middle" fontSize="11" fill="#c8a000" opacity="0.7">work hard, stay focused</text>
      <rect x="1060" y="440" width="200" height="22" rx="4" fill="#9b7040" />
      <rect x="1060" y="460" width="200" height="120" rx="4" fill="#8b6030" />
      <rect x="1060" y="458" width="200" height="8" rx="2" fill="#b08040" />
      <rect x="1068" y="578" width="14" height="60" rx="4" fill="#7a4f20" />
      <rect x="1238" y="578" width="14" height="60" rx="4" fill="#7a4f20" />
      <rect x="1072" y="414" width="60" height="28" rx="3" fill="#b03030" />
      <rect x="1072" y="406" width="60" height="28" rx="3" fill="#3060b0" />
      <rect x="1072" y="398" width="60" height="26" rx="3" fill="#30a050" />
      <ellipse cx="1210" cy="440" rx="18" ry="14" fill="#d0d0d0" stroke="#aaa" strokeWidth="2" />
      <rect x="1192" y="420" width="36" height="20" rx="3" fill="#c8c8c8" stroke="#aaa" strokeWidth="1.5" />
      <rect x="100" y="456" width="220" height="22" rx="4" fill="#b08040" stroke="#7a4f20" strokeWidth="1.5" />
      <rect x="100" y="466" width="220" height="8" rx="2" fill="#9b7040" />
      <rect x="110" y="476" width="16" height="104" rx="3" fill="#7a4f20" />
      <rect x="294" y="476" width="16" height="104" rx="3" fill="#7a4f20" />
      <rect x="125" y="435" width="80" height="56" rx="3" fill="#e8e8ff" stroke="#9999cc" strokeWidth="1.5" />
      <line x1="135" y1="448" x2="195" y2="448" stroke="#b0b0d8" strokeWidth="1.2" />
      <line x1="135" y1="459" x2="195" y2="459" stroke="#b0b0d8" strokeWidth="1.2" />
      <rect x="218" y="432" width="6" height="54" rx="3" fill="#f4c430" stroke="#c09020" strokeWidth="1" transform="rotate(-8,221,459)" />
    </g>
  );
}

/* ─────────────────────────────────────────
   Teacher figure
───────────────────────────────────────── */
function TeacherFigure({ pos, facingStudent, isDanger }: {
  pos: number; facingStudent: boolean; isDanger: boolean;
}) {
  const x = 1080 - (pos / 100) * 780;
  return (
    <g transform={`translate(${x}, 340)`}>
      <g transform={facingStudent ? "scale(-1,1) translate(-110,0)" : ""}>
        <TeacherSVG isDanger={isDanger} />
      </g>
      {isDanger && (
        <text x="55" y="-18" textAnchor="middle" fontSize="28"
          style={{ animation: "eyeBob 0.6s ease-in-out infinite alternate" }}>👁</text>
      )}
    </g>
  );
}

function TeacherSVG({ isDanger }: { isDanger: boolean }) {
  return (
    <svg width="110" height="240" viewBox="0 0 110 240" overflow="visible">
      <ellipse cx="55" cy="232" rx="38" ry="8" fill="#00000018" />
      <path d="M22 138 Q16 185 12 228 L98 228 Q94 185 88 138 Z" fill="#7c3aed" stroke="#5b21b6" strokeWidth="1.5" />
      <path d="M50 141 Q47 178 46 228" fill="none" stroke="#9333ea" strokeWidth="1.5" opacity="0.4" />
      <ellipse cx="32" cy="228" rx="18" ry="7" fill="#1a1a1a" />
      <ellipse cx="78" cy="228" rx="18" ry="7" fill="#1a1a1a" />
      <rect x="22" y="92" width="66" height="52" rx="10" fill="#9333ea" stroke="#7c3aed" strokeWidth="1.5" />
      <path d="M43 92 L55 108 L67 92" fill="none" stroke="#ddd6fe" strokeWidth="2.5" />
      <rect x="20" y="136" width="70" height="9" rx="4" fill="#3b0764" stroke="#7c3aed" strokeWidth="1" />
      <rect x="48" y="136" width="14" height="9" rx="3" fill="#a78bfa" />
      <path d="M22 100 Q6 114 4 140" fill="none" stroke="#7c3aed" strokeWidth="15" strokeLinecap="round" />
      <ellipse cx="5" cy="142" rx="9" ry="8" fill="#f5d48a" stroke="#c8963c" strokeWidth="1.5" />
      <g style={{ transformOrigin:"88px 104px", transform: isDanger?"rotate(-48deg)":"rotate(16deg)", transition:"transform 0.5s" }}>
        <path d="M88 104 Q104 118 108 144" fill="none" stroke="#9333ea" strokeWidth="15" strokeLinecap="round" />
        <ellipse cx="108" cy="147" rx="9" ry="8" fill="#f5d48a" stroke="#c8963c" strokeWidth="1.5" />
        <rect x="105" y="148" width="7" height="20" rx="3" fill="#f5f5dc" stroke="#ccc" strokeWidth="1.2" />
      </g>
      <rect x="46" y="80" width="18" height="15" rx="6" fill="#f5d48a" stroke="#c8963c" strokeWidth="1.5" />
      <ellipse cx="55" cy="60" rx="30" ry="28" fill="#f5d48a" stroke="#c8963c" strokeWidth="2" />
      <path d="M25 55 Q28 26 55 22 Q82 26 85 55 Q72 38 55 36 Q38 38 25 55Z" fill="#7a3a10" />
      <ellipse cx="55" cy="26" rx="16" ry="11" fill="#7a3a10" stroke="#5a2a08" strokeWidth="1.5" />
      <line x1="42" y1="25" x2="60" y2="31" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="58" r="10" fill="rgba(200,230,255,0.12)" stroke="#4a4a6a" strokeWidth="2" />
      <circle cx="70" cy="58" r="10" fill="rgba(200,230,255,0.12)" stroke="#4a4a6a" strokeWidth="2" />
      <path d="M50 58 Q55 55 60 58" fill="none" stroke="#4a4a6a" strokeWidth="1.8" />
      <circle cx={isDanger?37:41} cy="59" r="4" fill="#2d5020" style={{transition:"cx 0.3s"}} />
      <circle cx={isDanger?67:71} cy="59" r="4" fill="#2d5020" style={{transition:"cx 0.3s"}} />
      <circle cx={isDanger?38:42} cy="57" r="1.5" fill="white" />
      <circle cx={isDanger?68:72} cy="57" r="1.5" fill="white" />
      <path d={isDanger?"M30 47 Q40 42 50 47":"M30 49 Q40 45 50 49"} fill="none" stroke="#5a2a08" strokeWidth="2.5" strokeLinecap="round" style={{transition:"d 0.3s"}} />
      <path d={isDanger?"M60 47 Q70 42 80 47":"M60 49 Q70 45 80 49"} fill="none" stroke="#5a2a08" strokeWidth="2.5" strokeLinecap="round" style={{transition:"d 0.3s"}} />
      <path d={isDanger?"M44 72 Q55 67 66 72":"M46 72 Q55 77 64 72"} fill="none" stroke="#b03030" strokeWidth="2.2" strokeLinecap="round" style={{transition:"d 0.4s"}} />
      <circle cx="25" cy="62" r="4" fill="#fbbf24" stroke="#c8963c" strokeWidth="1.2" />
      <circle cx="85" cy="62" r="4" fill="#fbbf24" stroke="#c8963c" strokeWidth="1.2" />
    </svg>
  );
}

/* ─────────────────────────────────────────
   Student figure
───────────────────────────────────────── */
function StudentFigure({ holding, vapeVisible, isDanger, greenedOut, playing }: {
  holding: boolean; vapeVisible: boolean; isDanger: boolean; greenedOut: boolean; playing: boolean;
}) {
  const ty = greenedOut ? 304 : 280;

  return (
    <g transform={`translate(100, ${ty})`}>
      <svg width="200" height="300" viewBox="0 0 200 300" overflow="visible">
        <defs>
          <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c89a" />
            <stop offset="100%" stopColor="#e8a870" />
          </linearGradient>
          <linearGradient id="shirtG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={greenedOut ? "#3d1a00" : "#1e3a5f"} />
            <stop offset="50%" stopColor={greenedOut ? "#6b2d00" : "#2d5080"} />
            <stop offset="100%" stopColor={greenedOut ? "#3d1a00" : "#1e3a5f"} />
          </linearGradient>
          <linearGradient id="jeansG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4a6a" />
            <stop offset="100%" stopColor="#2a3a58" />
          </linearGradient>
        </defs>

        <rect x="12" y="185" width="34" height="55" rx="8" fill="#2d3748" stroke="#4a5568" strokeWidth="1.5" />
        <rect x="18" y="192" width="22" height="34" rx="4" fill="#374151" />
        <ellipse cx="29" cy="209" r="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
        <text x="29" y="212" textAnchor="middle" fontSize="7" fontWeight="900" fill="#475569">$</text>

        <rect x="58" y="188" width="24" height="52" rx="6" fill="url(#jeansG)" stroke="#1e2d4a" strokeWidth="1.5" />
        <rect x="88" y="188" width="24" height="52" rx="6" fill="url(#jeansG)" stroke="#1e2d4a" strokeWidth="1.5" />
        <ellipse cx="70" cy="244" rx="18" ry="9" fill="#e8e8e8" stroke="#aaa" strokeWidth="1.5" />
        <ellipse cx="100" cy="244" rx="18" ry="9" fill="#e8e8e8" stroke="#aaa" strokeWidth="1.5" />

        <path d="M50 118 L128 118 L138 200 L42 200 Z" fill="url(#shirtG)" />
        <rect x="68" y="158" width="46" height="32" rx="7" fill={greenedOut ? "#4d1f00" : "#182d4a"} stroke={greenedOut ? "#7c3810" : "#253d62"} strokeWidth="1.5" />
        <line x1="91" y1="160" x2="91" y2="189" stroke={greenedOut ? "#7c3810" : "#253d62"} strokeWidth="1.2" />
        <rect x="56" y="128" width="20" height="14" rx="3" fill={greenedOut ? "#7c3810" : "#253d62"} />
        <text x="66" y="138" textAnchor="middle" fontSize="7" fontWeight="900" fill={greenedOut ? "#fb923c" : "#94a3b8"}>
          {greenedOut ? "🌿" : "$PTF"}
        </text>

        <rect x="22" y="148" width="36" height="18" rx="8" fill={greenedOut ? "#3d1a00" : "#1e3a5f"} stroke={greenedOut ? "#7c3810" : "#253d62"} strokeWidth="1.5" />
        <ellipse cx="21" cy="157" rx="9" ry="8" fill="url(#skinG)" stroke="#c8963c" strokeWidth="1.5" />

        <g style={{
          transformOrigin: "118px 128px",
          transform: vapeVisible ? "rotate(-42deg)" : "rotate(10deg)",
          transition: "transform 0.35s cubic-bezier(.4,0,.2,1)",
        }}>
          <rect x="112" y="126" width="18" height="40" rx="9" fill={greenedOut ? "#3d1a00" : "#1e3a5f"} stroke={greenedOut ? "#7c3810" : "#253d62"} strokeWidth="1.5" />
          <ellipse cx="121" cy="170" rx="10" ry="9" fill="url(#skinG)" stroke="#c8963c" strokeWidth="1.5" />
        </g>

        {vapeVisible && (
          <g style={{ transformOrigin: "138px 152px", transform: "rotate(-48deg)" }}>
            <rect x="132" y="136" width="13" height="36" rx="6" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            <rect x="134" y="142" width="9" height="14" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
            <ellipse cx="138.5" cy="149" r="4" fill={greenedOut ? "#fb923c" : "#3b82f6"} opacity="0.8" />
            <rect x="134" y="132" width="9" height="7" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <circle cx="138.5" cy="170" r="3" fill={greenedOut ? "#fb923c" : "#60a5fa"}
              style={{ filter: `drop-shadow(0 0 5px ${greenedOut ? "#fb923c" : "#3b82f6"})` }} />
          </g>
        )}

        <rect x="74" y="108" width="20" height="14" rx="5" fill="url(#skinG)" stroke="#c8963c" strokeWidth="1.5" />

        <g style={{ transform: greenedOut ? "translate(4px, 6px) rotate(8deg)" : "translate(0,0) rotate(0deg)", transformOrigin: "84px 84px", transition: "transform 0.5s" }}>
          <ellipse cx="84" cy="84" rx="36" ry="34" fill="url(#skinG)" stroke="#c8963c" strokeWidth="2" />
          <path d="M48 78 Q52 44 84 40 Q116 44 120 78" fill="#2d1b06" />
          <ellipse cx="84" cy="52" rx="36" ry="18" fill="#2d1b06" />

          {greenedOut && (
            <>
              <rect x="50" y="18" width="68" height="46" rx="8" fill="#0f172a" />
              <rect x="50" y="18" width="68" height="12" rx="6" fill="#1e293b" />
              <rect x="42" y="60" width="84" height="9" rx="3" fill="#0d1424" />
              <rect x="42" y="67" width="84" height="3" rx="1" fill="#030810" opacity="0.65" />
              <text x="84" y="52" textAnchor="middle" fontSize="9" fontWeight="900" fill="#4ade80" letterSpacing="1">$POTIFY</text>
              <rect x="66" y="55" width="36" height="2.5" rx="1" fill="#22c55e" opacity="0.35" />
            </>
          )}

          <ellipse cx="48" cy="85" rx="7" ry="9" fill="url(#skinG)" stroke="#c8963c" strokeWidth="1.5" />
          <ellipse cx="120" cy="85" rx="7" ry="9" fill="url(#skinG)" stroke="#c8963c" strokeWidth="1.5" />

          <g transform={isDanger ? "translate(3,0)" : "translate(0,0)"} style={{ transition: "transform 0.2s" }}>
            <ellipse cx="66" cy="84" rx="8" ry="8.5" fill="white" stroke="#888" strokeWidth="1" />
            <circle cx="67.5" cy="85" r="5" fill={greenedOut ? "#5a0a0a" : "#2d1b06"} />
            <circle cx="68.5" cy="83" r="2" fill="white" />
            <ellipse cx="102" cy="84" rx="8" ry="8.5" fill="white" stroke="#888" strokeWidth="1" />
            <circle cx="103.5" cy="85" r="5" fill={greenedOut ? "#5a0a0a" : "#2d1b06"} />
            <circle cx="104.5" cy="83" r="2" fill="white" />
          </g>

          {greenedOut && (
            <>
              <ellipse cx="66" cy="84" rx="8" ry="8.5" fill="rgba(255,35,35,0.38)" />
              <ellipse cx="102" cy="84" rx="8" ry="8.5" fill="rgba(255,35,35,0.38)" />
              <path d="M58 84 Q66 75 74 84" fill="#f0b07a" />
              <path d="M94 84 Q102 75 110 84" fill="#f0b07a" />
            </>
          )}

          <path d={`M57 72 Q66 ${isDanger?67:69} 75 72`} fill="none" stroke="#2d1b06" strokeWidth="2.8" strokeLinecap="round" style={{transition:"d 0.2s"}} />
          <path d={`M93 72 Q102 ${isDanger?67:69} 111 72`} fill="none" stroke="#2d1b06" strokeWidth="2.8" strokeLinecap="round" style={{transition:"d 0.2s"}} />
          <path d="M80 94 Q84 99 88 94" fill="none" stroke="#c8963c" strokeWidth="1.8" strokeLinecap="round" />

          {isDanger
            ? <path d="M74 106 Q80 103 90 105" fill="none" stroke="#a07040" strokeWidth="2" strokeLinecap="round" />
            : <path d="M73 106 Q84 114 95 106" fill="none" stroke="#a07040" strokeWidth="2.2" strokeLinecap="round" />
          }

          {isDanger && <ellipse cx="114" cy="76" rx="4" ry="6" fill="#93c5fd" opacity="0.8" style={{animation:"driftDown 1.4s ease-in infinite"}} />}
        </g>

        {vapeVisible && (
          <>
            <ellipse cx="84" cy="58" rx={greenedOut?11:8} ry={greenedOut?9:7} fill={greenedOut?"rgba(120,240,140,0.60)":"rgba(210,230,255,0.65)"} style={{animation:"smokeDrift 1.3s ease-out infinite"}} />
            <ellipse cx="76" cy="44" rx={greenedOut?9:7} ry={greenedOut?8:6} fill={greenedOut?"rgba(100,220,120,0.50)":"rgba(210,230,255,0.48)"} style={{animation:"smokeDrift 1.6s ease-out infinite 0.2s"}} />
            <ellipse cx="92" cy="32" rx={greenedOut?8:6} ry={greenedOut?7:5} fill={greenedOut?"rgba(80,200,100,0.40)":"rgba(210,230,255,0.35)"} style={{animation:"smokeDrift 1.9s ease-out infinite 0.45s"}} />
            <ellipse cx="79" cy="20" rx={greenedOut?7:5} ry={greenedOut?6:4} fill={greenedOut?"rgba(60,180,80,0.28)":"rgba(210,230,255,0.22)"} style={{animation:"smokeDrift 2.2s ease-out infinite 0.7s"}} />
            {greenedOut && <>
              <ellipse cx="96" cy="14" rx="5" ry="4" fill="rgba(60,180,80,0.18)" style={{animation:"smokeDrift 2.5s ease-out infinite 0.9s"}} />
              <ellipse cx="72" cy="8"  rx="4" ry="3" fill="rgba(80,200,100,0.12)" style={{animation:"smokeDrift 2.8s ease-out infinite 1.1s"}} />
            </>}
          </>
        )}
      </svg>
    </g>
  );
}

/* ─────────────────────────────────────────
   Smoke cloud
───────────────────────────────────────── */
function SmokeCloud({ big }: { big: boolean }) {
  const puffs = big
    ? [{ x:200,y:430,rx:26,ry:20,d:"0s" },{ x:184,y:396,rx:20,ry:16,d:"0.15s" },{ x:218,y:366,rx:17,ry:14,d:"0.3s" },{ x:198,y:340,rx:13,ry:11,d:"0.45s" }]
    : [{ x:200,y:430,rx:18,ry:14,d:"0s" },{ x:190,y:406,rx:14,ry:11,d:"0.18s" },{ x:210,y:382,rx:11,ry:9,d:"0.36s" }];
  return (
    <g>
      {puffs.map((p,i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry}
          fill="rgba(210,228,255,0.72)"
          style={{animation:`cloudRise 2s ease-out infinite`,animationDelay:p.d}} />
      ))}
    </g>
  );
}

/* ─────────────────────────────────────────
   Green haze
───────────────────────────────────────── */
function GreenHaze() {
  const puffs = [
    { x: 240, y: 520, rx: 38, ry: 26, delay: "0s",    dur: "3.8s" },
    { x: 190, y: 490, rx: 28, ry: 20, delay: "0.6s",  dur: "4.2s" },
    { x: 290, y: 480, rx: 22, ry: 16, delay: "1.2s",  dur: "3.5s" },
    { x: 220, y: 455, rx: 18, ry: 13, delay: "1.8s",  dur: "4.8s" },
    { x: 260, y: 440, rx: 14, ry: 10, delay: "0.4s",  dur: "3.2s" },
    { x: 310, y: 465, rx: 16, ry: 12, delay: "2.1s",  dur: "4.0s" },
    { x: 170, y: 470, rx: 12, ry:  9, delay: "1.5s",  dur: "3.7s" },
  ];
  return (
    <g>
      <ellipse cx="230" cy="480" rx="160" ry="80" fill="rgba(60,180,60,0.07)"
        style={{ animation: "greenPulse 3s ease-in-out infinite" }} />
      {puffs.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry}
          fill="rgba(120,200,100,0.28)"
          style={{ animation: `greenDrift ${p.dur} ease-out infinite`, animationDelay: p.delay }} />
      ))}
    </g>
  );
}

/* ─────────────────────────────────────────
   Seed reward banner
───────────────────────────────────────── */
function SeedReward({ score, reward, loading, accent = "#4ade80" }: {
  score: number;
  reward: RewardResult | null;
  loading: boolean;
  accent?: string;
}) {
  return <div style={{marginTop:12,padding:12,fontSize:12,color:accent,lineHeight:1.5,maxWidth:320}}>
    Practice mode — game Seed rewards are disabled pending secure server validation.
    Seeds are off-chain, nontransferable community points, not $POTIFY tokens.
  </div>;
}

/* ─────────────────────────────────────────
   UI helpers
───────────────────────────────────────── */
function Modal({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:light?"rgba(0,0,0,0.65)":"rgba(4,8,20,0.88)", zIndex:30 }}>
      <div style={{ background:light?"#fff":"linear-gradient(155deg,#050d1ef5,#0a1a3af5)", border:light?"2.5px solid #dc2626":"2px solid rgba(100,130,255,0.4)", borderRadius:24, padding:"32px 58px", textAlign:"center", boxShadow:light?"0 8px 40px #dc262620":"0 0 50px rgba(29,78,216,0.2)", animation:"popIn 0.32s cubic-bezier(.34,1.56,.64,1)", fontFamily:"system-ui, sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function btnStyle(bg1: string, bg2: string, color: string): React.CSSProperties {
  return { padding:"14px 44px", background:`linear-gradient(135deg, ${bg1}, ${bg2})`, color, border:"none", borderRadius:14, fontWeight:900, fontSize:18, cursor:"pointer", fontFamily:"system-ui, sans-serif", display:"flex", alignItems:"center", gap:8, transition:"all 0.12s ease" };
}

const STYLES = `
  .vape-controls { padding-bottom: max(24px, env(safe-area-inset-bottom, 24px)); }
  @media (max-width: 820px) { .vape-controls { padding-bottom: max(36px, env(safe-area-inset-bottom, 36px)); } }
  @keyframes dangerFlicker { from{opacity:0.4} to{opacity:1} }
  @keyframes popIn  { 0%{transform:scale(0.45);opacity:0} 70%{transform:scale(1.07)} 100%{transform:scale(1);opacity:1} }
  @keyframes spinPop{ 0%{transform:scale(0) rotate(-180deg);opacity:0} 70%{transform:scale(1.15) rotate(10deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
  @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes cloudRise  { 0%{transform:translateY(0) scale(1);opacity:0.85} 100%{transform:translateY(-90px) scale(2.5);opacity:0} }
  @keyframes smokeDrift { 0%{transform:translateY(0) scale(1);opacity:0.6} 100%{transform:translateY(-65px) scale(2);opacity:0} }
  @keyframes driftDown  { 0%{transform:translateY(-4px);opacity:0.9} 100%{transform:translateY(14px);opacity:0} }
  @keyframes eyeBob     { from{transform:scale(1)} to{transform:scale(1.3) translateY(-4px)} }
  @keyframes rotMin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes rotHr      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes greenDrift { 0%{transform:translateY(0) scale(1);opacity:0.7} 100%{transform:translateY(-110px) scale(3);opacity:0} }
  @keyframes greenPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
`;
