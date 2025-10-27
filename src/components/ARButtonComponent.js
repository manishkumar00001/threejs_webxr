import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

export function setupARButton(renderer, model, reticle) {
  const button = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] });
  document.body.appendChild(button);

  renderer.xr.addEventListener("sessionstart", () => {
    const session = renderer.xr.getSession();

    const onSelect = () => {
      if (reticle.visible && model) {
        model.visible = true;
        model.position.setFromMatrixPosition(reticle.matrix);
      }
    };

    session.addEventListener("select", onSelect);
  });
}
