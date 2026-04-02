import { useRef, useCallback } from 'react';

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPos(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

export function useTacticAnimation(stateRef, setOverlay, requestDraw) {
  const animRef = useRef({
    running: false,
    frameId: null,
    tactic: null,
    stepIndex: 0,
    stepStartTime: 0,
    prevStep: null,
    nextStep: null,
    passAnim: null,
  });

  const stop = useCallback(() => {
    const a = animRef.current;
    a.running = false;
    a.tactic = null;
    a.passAnim = null;
    if (a.frameId) { cancelAnimationFrame(a.frameId); a.frameId = null; }
    setOverlay({ name: '', desc: '' });
  }, [setOverlay]);

  const start = useCallback((tactic) => {
    stop();
    const a = animRef.current;
    a.tactic = tactic;
    a.stepIndex = 0;

    // apply initial step
    const first = tactic.steps[0];
    const s = stateRef.current;
    s.teamA = first.teamA.map(p => ({...p}));
    s.teamB = first.teamB.map(p => ({...p}));
    s.ball = {...first.ball};
    setOverlay({ name: tactic.name, desc: first.desc || '' });

    if (tactic.steps.length <= 1) { requestDraw(); return; }

    a.stepIndex = 1;
    a.prevStep = tactic.steps[0];
    a.nextStep = tactic.steps[1];
    a.stepStartTime = performance.now();
    a.running = true;
    a.passAnim = null;

    if (a.nextStep.pass) {
      const from = a.prevStep.teamA[a.nextStep.pass[0]];
      const to = a.nextStep.teamA[a.nextStep.pass[1]];
      a.passAnim = { from: {...from}, to: {...to}, progress: 0 };
    }

    const animate = (now) => {
      if (!a.running || !a.tactic) return;
      const elapsed = now - a.stepStartTime;
      const duration = a.nextStep.duration || 1000;
      const t = Math.min(1, elapsed / duration);
      const et = easeInOut(t);
      const s = stateRef.current;

      for (let i = 0; i < 5; i++) {
        s.teamA[i] = lerpPos(a.prevStep.teamA[i], a.nextStep.teamA[i], et);
        s.teamB[i] = lerpPos(a.prevStep.teamB[i], a.nextStep.teamB[i], et);
      }

      if (a.passAnim) {
        a.passAnim.progress = et;
        s.ball = lerpPos(a.passAnim.from, a.passAnim.to, et);
      } else {
        s.ball = lerpPos(a.prevStep.ball, a.nextStep.ball, et);
      }

      setOverlay({ name: a.tactic.name, desc: a.nextStep.desc || '' });
      requestDraw();

      if (t >= 1) {
        // apply final positions
        s.teamA = a.nextStep.teamA.map(p => ({...p}));
        s.teamB = a.nextStep.teamB.map(p => ({...p}));
        s.ball = {...a.nextStep.ball};
        a.stepIndex++;

        if (a.stepIndex < a.tactic.steps.length) {
          a.prevStep = a.tactic.steps[a.stepIndex - 1];
          a.nextStep = a.tactic.steps[a.stepIndex];
          a.stepStartTime = now + 400;
          a.passAnim = null;
          if (a.nextStep.pass) {
            const from = a.prevStep.teamA[a.nextStep.pass[0]];
            const to = a.nextStep.teamA[a.nextStep.pass[1]];
            a.passAnim = { from: {...from}, to: {...to}, progress: 0 };
          }
        } else {
          a.running = false;
          a.frameId = null;
          requestDraw();
          return;
        }
      }
      a.frameId = requestAnimationFrame(animate);
    };

    a.frameId = requestAnimationFrame(animate);
  }, [stop, stateRef, setOverlay, requestDraw]);

  return { start, stop, animRef };
}
