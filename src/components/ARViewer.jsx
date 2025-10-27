import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createARScene } from "./ARScene.js";
import { loadModel } from "./ModelLoader.js";
import { setupARButton } from "./ARButtonComponent.js";

const ARViewer = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer, controls, reticle, model;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    // ✅ Create Scene, Camera, Renderer, Controls, Reticle
    const setup = createARScene(containerRef.current);
    scene = setup.scene;
    camera = setup.camera;
    renderer = setup.renderer;
    controls = setup.controls;
    reticle = setup.reticle;

    // ✅ Load 3D Model
    loadModel(scene, controls).then((m) => {
      model = m;
      setupARButton(renderer, model, reticle);
    });

    // 🎥 Animation Loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop((timestamp, frame) => {
      const delta = clock.getDelta();
      controls.update();

      // ✅ AR hit test
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
          session.requestReferenceSpace("viewer").then((refSpace) => {
            session
              .requestHitTestSource({ space: refSpace })
              .then((source) => (hitTestSource = source));
          });

          session.addEventListener("end", () => {
            hitTestSourceRequested = false;
            hitTestSource = null;
          });

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          } else {
            reticle.visible = false;
          }
        }
      }

      renderer.render(scene, camera);
    });

    // ✅ Handle Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ✅ Cleanup
    return () => {
      window.removeEventListener("resize", onResize);
      if (renderer.xr.getSession()) renderer.xr.getSession().end();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#fff",
        overflow: "hidden",
      }}
    />
  );
};

export default ARViewer;
