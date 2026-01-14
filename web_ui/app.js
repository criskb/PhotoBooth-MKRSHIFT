import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#scene");
const stylesContainer = document.querySelector(".styles");
const statusLabel = document.querySelector(".status__label");
const statusMeta = document.querySelector(".status__meta");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0e16, 8, 18);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.4, 9);

const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(5, 6, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x5fd3ff, 0.7);
rimLight.position.set(-5, 2, -4);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x0d111a, roughness: 0.7, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.1;
scene.add(floor);

const stripGroup = new THREE.Group();

const stripMaterial = new THREE.MeshStandardMaterial({
  color: 0x1c2333,
  roughness: 0.35,
  metalness: 0.5,
});
const strip = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.8, 0.25), stripMaterial);
stripGroup.add(strip);

const frameMaterial = new THREE.MeshStandardMaterial({
  color: 0x0f141f,
  roughness: 0.45,
  metalness: 0.2,
});

const photoMaterial = new THREE.MeshStandardMaterial({
  color: 0xf7a35c,
  roughness: 0.25,
  metalness: 0.05,
  emissive: 0x1a1207,
});

const framePositions = [-1.7, 0, 1.7];
framePositions.forEach((x, index) => {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 0.3), frameMaterial);
  frame.position.set(x, 0, 0.1);
  stripGroup.add(frame);

  const photo = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.7), photoMaterial.clone());
  photo.position.set(x, 0, 0.27);
  photo.material.color.setHSL(0.08 + index * 0.08, 0.65, 0.6);
  stripGroup.add(photo);
});

stripGroup.position.set(0, 0.4, 0);
scene.add(stripGroup);

const glowRing = new THREE.Mesh(
  new THREE.RingGeometry(2.6, 2.9, 64),
  new THREE.MeshBasicMaterial({ color: 0x5fd3ff, transparent: true, opacity: 0.35 })
);
glowRing.rotation.x = -Math.PI / 2;
glowRing.position.y = -0.95;
scene.add(glowRing);

const mouse = { x: 0, y: 0 };

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
});

function resize() {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();
  stripGroup.rotation.y = THREE.MathUtils.lerp(stripGroup.rotation.y, mouse.x * 0.35, 0.08);
  stripGroup.rotation.x = THREE.MathUtils.lerp(stripGroup.rotation.x, -mouse.y * 0.15, 0.08);
  stripGroup.position.y = 0.4 + Math.sin(elapsed * 1.2) * 0.08;
  glowRing.material.opacity = 0.3 + Math.sin(elapsed * 1.4) * 0.08;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

function toTitleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function loadStyles() {
  try {
    const response = await fetch("/api/styles");
    if (!response.ok) {
      throw new Error("Failed to load styles");
    }
    const data = await response.json();
    const styles = data.styles ?? [];
    stylesContainer.innerHTML = "";
    styles.forEach((style) => {
      const button = document.createElement("button");
      button.className = "style";
      button.textContent = toTitleCase(style);
      button.addEventListener("click", () => {
        document.querySelectorAll(".style").forEach((el) => el.classList.remove("style--active"));
        button.classList.add("style--active");
        statusLabel.textContent = "Style Selected";
        statusMeta.textContent = `${toTitleCase(style)} ready to shoot`;
      });
      stylesContainer.appendChild(button);
    });
  } catch (error) {
    statusLabel.textContent = "Offline";
    statusMeta.textContent = "Unable to load styles";
  }
}

loadStyles();
