import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function loadModel(scene, controls) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      "/models/Sofa.glb",
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.3, 0.3, 0.3);
        model.position.set(0, 0, -0.5);
        scene.add(model);
        controls.target.copy(model.position);
        resolve(model);
      },
      undefined,
      (error) => reject(error)
    );
  });
}
