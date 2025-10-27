import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createARScene } from "./ARScene.js";
import { loadModel } from "./ModelLoader.js";
import { setupARButton } from "./ARButtonComponent.js";

const ARViewer = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer, controls, reticle, model;

    const setup = createARScene(containerRef.current);
    scene = setup.scene;
    camera = setup.camera;
    renderer = setup.renderer;
    controls = setup.controls;
    reticle = setup.reticle;

    loadModel(scene, controls).then((m) => {
      model = m;
      setupARButton(renderer, model, reticle);
    });

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      if (renderer?.xr.getSession()) renderer.xr.getSession().end();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", background: "#fff", overflow: "hidden" }}
    />
  );
};

export default ARViewer;
