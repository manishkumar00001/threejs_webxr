import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const ARViewer = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer, model, reticle, controls;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

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
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(1, 2, 1);
    scene.add(dirLight);

    // ✅ Reticle (AR placement ring)
    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // ✅ Load 3D Model
    const loader = new GLTFLoader();
    loader.load(
      "/models/Sofa.glb",
      (gltf) => {
        model = gltf.scene;
        model.scale.set(0.3, 0.3, 0.3);
        model.position.set(0, 0, -0.5);
        scene.add(model);
        controls.target.copy(model.position);
      },
      undefined,
      (err) => console.error("Error loading model:", err)
    );

    // ✅ Orbit Controls (Desktop + Mobile Touch)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 0.3;
    controls.maxDistance = 2.5;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // ✅ AR Button
    const arButton = ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] });
    document.body.appendChild(arButton);

    // ✅ AR Session Events
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

    // 🎥 Animation Loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop((timestamp, frame) => {
      const delta = clock.getDelta();
      controls.update();
      if (model && controls.autoRotate) {
        model.rotation.y += delta * 0.3;
      }

      // ✅ AR Hit Test
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

    // ✅ Handle Window Resize
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
