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

    // ✋ Gesture variables
    let startDistance = 0;
    let startScale = 1;
    let prevX = null;
    let prevY = null;
    let mode = null; // "rotate" or "move"

    // 👉 Touch start
    window.addEventListener("touchstart", (e) => {
      if (!model.visible) return;

      if (e.touches.length === 2) {
        // Two fingers → Zoom
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        startDistance = Math.hypot(dx, dy);
        startScale = model.scale.x;
        mode = "zoom";
      } else if (e.touches.length === 1) {
        // One finger → move or rotate depending on gesture direction
        prevX = e.touches[0].pageX;
        prevY = e.touches[0].pageY;
        mode = "move";
      }
    });

    // 👉 Touch move
    window.addEventListener("touchmove", (e) => {
      if (!model.visible) return;

      // 🔹 Zoom (pinch)
      if (mode === "zoom" && e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const newDistance = Math.hypot(dx, dy);
        const scale = (newDistance / startDistance) * startScale;
        model.scale.set(scale, scale, scale);
      }

      // 🔹 Move (1 finger drag)
      if (mode === "move" && e.touches.length === 1) {
        const deltaX = e.touches[0].pageX - prevX;
        const deltaY = e.touches[0].pageY - prevY;

        // move sensitivity
        const moveSpeed = 0.001;

        // Move model on X-Z plane (floor)
        model.position.x -= deltaX * moveSpeed;
        model.position.z += deltaY * moveSpeed;

        prevX = e.touches[0].pageX;
        prevY = e.touches[0].pageY;
      }
    });

    // 👉 Touch end
    window.addEventListener("touchend", (e) => {
      prevX = null;
      prevY = null;
      mode = null;
    });
  });
}
