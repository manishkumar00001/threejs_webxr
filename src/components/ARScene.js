import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createARScene(container) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 2, 1);
  scene.add(dirLight);

  // ✅ Green Circle (manually interactive)
  const circle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  circle.position.set(0, 0, -0.5);
  scene.add(circle);

  // Orbit Controls (desktop view control)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = 0.3;
  controls.maxDistance = 3.0;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;

  // ✅ Manual touch/zoom for circle
  let lastTouchDist = 0;
  let isDragging = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function getIntersects(x, y) {
    pointer.x = (x / window.innerWidth) * 2 - 1;
    pointer.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(circle);
  }

  // 🖱️ Mouse drag
  renderer.domElement.addEventListener("mousedown", (e) => {
    const hits = getIntersects(e.clientX, e.clientY);
    if (hits.length > 0) isDragging = true;
  });

  renderer.domElement.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const hits = getIntersects(e.clientX, e.clientY);
    if (hits.length > 0) {
      const point = hits[0].point;
      circle.position.copy(point);
    }
  });

  renderer.domElement.addEventListener("mouseup", () => (isDragging = false));

  // 📱 Touch drag & pinch zoom
  renderer.domElement.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const hits = getIntersects(e.touches[0].clientX, e.touches[0].clientY);
      if (hits.length > 0) isDragging = true;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
    }
  });

  renderer.domElement.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && isDragging) {
      const hits = getIntersects(e.touches[0].clientX, e.touches[0].clientY);
      if (hits.length > 0) {
        const point = hits[0].point;
        circle.position.copy(point);
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const scaleChange = newDist / lastTouchDist;
      circle.scale.multiplyScalar(scaleChange);
      lastTouchDist = newDist;
    }
  });

  renderer.domElement.addEventListener("touchend", () => (isDragging = false));

  // ✅ Mouse wheel zoom for circle
  renderer.domElement.addEventListener("wheel", (e) => {
    e.preventDefault();
    const scaleChange = 1 - e.deltaY * 0.001;
    circle.scale.multiplyScalar(scaleChange);
  });

  return { scene, camera, renderer, controls, reticle: circle };
}
