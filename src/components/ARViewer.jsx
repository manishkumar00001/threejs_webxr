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
    let currentSession = null;

    // ✅ Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // ✅ Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // ✅ Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // ✅ Light
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

    // ✅ Load Model
    const loader = new GLTFLoader();
loader.load(
  "/models/Sofa.glb",
  (gltf) => {
    model = gltf.scene;
    model.scale.set(0.3, 0.3, 0.3);
    model.visible = true;
    model.position.set(0, 0, -0.5);

    // 👇 Add this line to tilt model slightly forward
    model.rotation.x = Math.PI / 8; // around 22.5° tilt forward

    scene.add(model);
  },
  undefined,
  (err) => console.error("Error loading model:", err)
);


    // ✅ AR Button
    const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] });
    document.body.appendChild(arButton);

    // ✅ Handle AR session start
    renderer.xr.addEventListener("sessionstart", () => {
      currentSession = renderer.xr.getSession();

      // Tap to place model
      const onSelect = () => {
        if (reticle.visible && model) {
          model.visible = true;
          model.position.setFromMatrixPosition(reticle.matrix);
        }
      };
      currentSession.addEventListener("select", onSelect);

      // ✅ Pinch zoom & rotate
      let initialDistance = 0;
      let initialRotation = 0;

      currentSession.addEventListener("inputsourceschange", (event) => {
        const touches = [...currentSession.inputSources].filter((s) => s.hand);
        if (touches.length === 2 && model) {
          const [t1, t2] = touches.map((t) => t.hand[0].targetRaySpace);
          const pos1 = new THREE.Vector3().setFromMatrixPosition(t1.matrixWorld);
          const pos2 = new THREE.Vector3().setFromMatrixPosition(t2.matrixWorld);

          const distance = pos1.distanceTo(pos2);

          if (!initialDistance) initialDistance = distance;
          const scaleChange = distance / initialDistance;
          model.scale.setScalar(0.3 * scaleChange);
        }
      });
    });

    // ✅ Render Loop
    const render = (timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
          session.requestReferenceSpace("viewer").then((refSpace) => {
            session.requestHitTestSource({ space: refSpace }).then((source) => (hitTestSource = source));
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

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh", background: "white" }} />;
};

export default ARViewer;
