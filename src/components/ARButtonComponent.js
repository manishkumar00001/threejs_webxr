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

    // ✋ Add touch gesture listeners
    let startDistance = 0;
    let startScale = 1;

    window.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        startDistance = Math.hypot(dx, dy);
        startScale = model.scale.x;
      }
    });

    window.addEventListener("touchmove", (e) => {
      if (model.visible && e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const newDistance = Math.hypot(dx, dy);
        const scale = (newDistance / startDistance) * startScale;
        model.scale.set(scale, scale, scale);
      }
    });

    // 👉 One-finger drag to rotate
    let prevX = null;
    window.addEventListener("touchmove", (e) => {
      if (model.visible && e.touches.length === 1) {
        if (prevX !== null) {
          const deltaX = e.touches[0].pageX - prevX;
          model.rotation.y -= deltaX * 0.01;
        }
        prevX = e.touches[0].pageX;
      }
    });

    window.addEventListener("touchend", () => {
      prevX = null;
    });
  });
}
