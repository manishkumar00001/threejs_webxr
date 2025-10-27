import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

const ARViewer = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer, model, reticle;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    // ✅ Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // ✅ Camera
    camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    );

    // ✅ Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // ✅ AR Button
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: [],
    });
    document.body.appendChild(arButton);

    // ✅ Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // ✅ Reticle (surface indicator)
    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // ✅ Load GLTF model
    const loader = new GLTFLoader();
    loader.load(
      "/models/Sofa.glb", // your model path
      (gltf) => {
        model = gltf.scene;
        model.scale.set(0.3, 0.3, 0.3);
        model.position.set(0, 0, -1);
        model.visible = true;
        scene.add(model);
      },
      undefined,
      (error) => console.error("❌ Model load error:", error)
    );

    // ✅ Animation loop
    const render = (timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        // Setup hit test once
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
          if (hitTestResults.length) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);

            // ✅ Place model on surface
            if (model && !model.visible) {
              model.visible = true;
              model.position.setFromMatrixPosition(reticle.matrix);
            }
          } else {
            reticle.visible = false;
          }
        }
      }

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(render);

    // ✅ Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ✅ Cleanup
    return () => {
      window.removeEventListener("resize", onResize);
      if (containerRef.current) containerRef.current.innerHTML = "";
      if (renderer.xr.getSession()) renderer.xr.getSession().end();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", background: "white" }}
    />
  );
};

export default ARViewer;
