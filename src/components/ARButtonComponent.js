import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

export function setupARButton(renderer, model, reticle) {
  const button = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] });
  document.body.appendChild(button);

  let session;

  renderer.xr.addEventListener("sessionstart", () => {
    session = renderer.xr.getSession();

    const onSelect = () => {
      if (reticle.visible && model) {
        model.visible = true;
        model.position.setFromMatrixPosition(reticle.matrix);
      }
    };

    session.addEventListener("select", onSelect);

    // Gesture state
    let mode = null; // "single" (rotate+vertical move), "two" (pan+zoom)
    let prevX = 0, prevY = 0;
    let prevMidX = 0, prevMidY = 0;
    let startDistance = 0;
    let startScale = 1;
    const moveSpeed = 0.0015;   // tweak for translation sensitivity
    const rotateSpeed = 0.01;   // tweak for rotation sensitivity
    const verticalMoveSpeed = 0.001; // vertical drag moves forward/back

    // helper: midpoint of two touches
    function midpoint(t0, t1) {
      return {
        x: (t0.pageX + t1.pageX) / 2,
        y: (t0.pageY + t1.pageY) / 2
      };
    }

    window.addEventListener("touchstart", (e) => {
      if (!model.visible) return;

      if (e.touches.length === 1) {
        mode = "single";
        prevX = e.touches[0].pageX;
        prevY = e.touches[0].pageY;
      } else if (e.touches.length === 2) {
        mode = "two";
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        startDistance = Math.hypot(dx, dy);
        startScale = model.scale.x;

        const mid = midpoint(e.touches[0], e.touches[1]);
        prevMidX = mid.x;
        prevMidY = mid.y;
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!model.visible) return;

      // SINGLE FINGER: rotate horizontally, vertical drag -> move forward/back on Z
      if (mode === "single" && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.pageX - prevX;
        const deltaY = touch.pageY - prevY;

        // rotate model around Y-axis (horizontal drag)
        model.rotation.y -= deltaX * rotateSpeed;

        // move forward/back based on vertical drag (positive drag up -> forward)
        // choose sign so dragging finger up moves model forward (decrease z)
        model.position.z += deltaY * verticalMoveSpeed;

        prevX = touch.pageX;
        prevY = touch.pageY;
      }

      // TWO FINGER: pinch to zoom + two-finger pan to move on X/Z plane
      if (mode === "two" && e.touches.length === 2) {
        // pinch -> scale
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const newDistance = Math.hypot(dx, dy);
        const scale = (newDistance / startDistance) * startScale;
        // clamp scale to avoid zero or too big
        const clamped = Math.max(0.05, Math.min(scale, 5));
        model.scale.set(clamped, clamped, clamped);

        // two-finger pan -> move model in X/Z based on midpoint delta
        const mid = midpoint(e.touches[0], e.touches[1]);
        const deltaMidX = mid.x - prevMidX;
        const deltaMidY = mid.y - prevMidY;

        // map screen delta to world movement:
        // horizontal screen movement -> model.x (left/right)
        // vertical screen movement -> model.z (forward/back)
        model.position.x += deltaMidX * moveSpeed;      // left/right correspond to finger direction
        model.position.z += deltaMidY * moveSpeed;      // drag up -> negative deltaMidY -> move forward/back

        prevMidX = mid.x;
        prevMidY = mid.y;
      }
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      // Reset when fingers lifted
      if (e.touches.length === 0) {
        mode = null;
        prevX = prevY = prevMidX = prevMidY = 0;
      } else if (e.touches.length === 1) {
        // went from two -> one finger: switch to single mode
        mode = "single";
        prevX = e.touches[0].pageX;
        prevY = e.touches[0].pageY;
      }
    }, { passive: true });
  });
}
