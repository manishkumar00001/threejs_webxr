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

    // ✅ Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // ✅ Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // ✅ Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // ✅ Reticle (AR placement marker)
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
      "/models/Sofa.glb",
      (gltf) => {
        model = gltf.scene;
        model.scale.set(0.3, 0.3, 0.3);
        model.rotation.x = Math.PI / 12;
        model.visible = true;
        model.position.set(0, 0, -0.5);
        scene.add(model);
      },
      undefined,
      (err) => console.error("Error loading model:", err)
    );

    // ✅ AR Button
    const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] });
    document.body.appendChild(arButton);

    // ✅ On AR Session Start
    renderer.xr.addEventListener("sessionstart", () => {
      currentSession = renderer.xr.getSession();

      const onSelect = () => {
        if (reticle.visible && model) {
          model.visible = true;
          model.position.setFromMatrixPosition(reticle.matrix);
        }
      };
      currentSession.addEventListener("select", onSelect);
    });

    // ---------------------------------------------------
    // 🖱️ & 🤚 Universal Interaction Controls (Desktop + Mobile)
    // ---------------------------------------------------

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let rotationX = 0;
    let rotationY = 0;
    let initialDistance = 0;
    let initialScale = 0.3;
    let lastInteraction = Date.now();

    // ----- Desktop Mouse Controls -----
    renderer.domElement.addEventListener("mousedown", (e) => {
      if (!model || !model.visible) return;
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    renderer.domElement.addEventListener("mousemove", (e) => {
      if (!model || !model.visible || !isDragging) return;
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;

      rotationY += deltaX * 0.005;
      rotationX += deltaY * 0.005;

      // Clamp vertical rotation
      rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

      model.rotation.set(rotationX, rotationY, 0);

      lastX = e.clientX;
      lastY = e.clientY;
      lastInteraction = Date.now();
    });

    renderer.domElement.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // ✅ Mouse wheel zoom (model only)
    renderer.domElement.addEventListener("wheel", (e) => {
      if (!model || !model.visible) return;
      e.preventDefault();
      let newScale = model.scale.x - e.deltaY * 0.001;
      newScale = Math.min(Math.max(newScale, 0.1), 1.0);
      model.scale.setScalar(newScale);
      lastInteraction = Date.now();
    });

    // ----- Mobile Touch Controls -----
    renderer.domElement.addEventListener("touchstart", (e) => {
      if (!model || !model.visible) return;

      if (e.touches.length === 1) {
        isDragging = true;
        lastX = e.touches[0].pageX;
        lastY = e.touches[0].pageY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        initialDistance = Math.sqrt(dx * dx + dy * dy);
        initialScale = model.scale.x;
      }
    });

    renderer.domElement.addEventListener("touchmove", (e) => {
      if (!model || !model.visible) return;

      if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].pageX - lastX;
        const deltaY = e.touches[0].pageY - lastY;

        rotationY += deltaX * 0.005;
        rotationX += deltaY * 0.005;
        rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

        model.rotation.set(rotationX, rotationY, 0);
        lastX = e.touches[0].pageX;
        lastY = e.touches[0].pageY;
        lastInteraction = Date.now();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        const scaleChange = newDistance / initialDistance;
        let newScale = initialScale * scaleChange;
        newScale = Math.min(Math.max(newScale, 0.1), 1.0);
        model.scale.setScalar(newScale);
        lastInteraction = Date.now();
      }
    });

    renderer.domElement.addEventListener("touchend", () => {
      isDragging = false;
    });

    // ---------------------------------------------------
    // 🎥 Animation Loop
    // ---------------------------------------------------
    const clock = new THREE.Clock();

    const render = (timestamp, frame) => {
      const delta = clock.getDelta();

      // ✅ Auto-spin after 2 seconds idle
      if (model && Date.now() - lastInteraction > 2000 && !isDragging) {
        model.rotation.y += delta * 0.5;
      }

      // ✅ AR hit-test
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

    // ✅ Resize handler
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
        background: "white",
        overflow: "hidden",
      }}
    />
  );
};

export default ARViewer;
