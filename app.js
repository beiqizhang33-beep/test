const cameraView = document.querySelector("#camera-view");
const webglLayer = document.querySelector("#webgl-layer");
const stage = document.querySelector("#stage");
const stageBadge = document.querySelector("#stage-badge");
const loadingOverlay = document.querySelector("#loading-overlay");
const loadingText = document.querySelector("#loading-text");
const statusLine = document.querySelector("#status");
const viewerCaption = document.querySelector("#viewer-caption");
const show3dButton = document.querySelector("#show-3d");
const showCameraButton = document.querySelector("#show-camera");
const freeViewButton = document.querySelector("#free-view");
const fullscreenButton = document.querySelector("#fullscreen");

let THREE;
let renderer;
let scene;
let camera;
let controls;
let mixer;
let model;
let is3DVisible = false;
let isFreeView = false;
let isLoading = false;
let resizeObserver;
let lastFrameTime = performance.now();

function setStatus(message, tone = "warm") {
  statusLine.textContent = message;
  statusLine.dataset.tone = tone;
}

function setLoading(visible, message = "正在加载 3D 场景…") {
  loadingOverlay.classList.toggle("is-hidden", !visible);
  loadingText.textContent = message;
}

function showCameraView() {
  is3DVisible = false;
  isFreeView = false;
  cameraView.classList.remove("is-hidden");
  webglLayer.classList.add("is-hidden");
  webglLayer.setAttribute("aria-hidden", "true");
  stageBadge.textContent = "CAMERA VIEW";
  viewerCaption.textContent = "Blender camera render · frame 453";
  freeViewButton.textContent = "自由观察";
  freeViewButton.setAttribute("aria-pressed", "false");
  freeViewButton.disabled = true;
  if (controls) controls.enabled = false;
  setStatus("摄像机画面已就绪 · 第 453 帧 · 1920×1080");
}

function showWebGLView() {
  is3DVisible = true;
  cameraView.classList.add("is-hidden");
  webglLayer.classList.remove("is-hidden");
  webglLayer.setAttribute("aria-hidden", "false");
  stageBadge.textContent = isFreeView ? "WEBGL · FREE VIEW" : "WEBGL · CAMERA";
  viewerCaption.textContent = isFreeView
    ? "WebGL scene · free camera controls enabled"
    : "WebGL scene · embedded Blender camera";
  freeViewButton.disabled = false;
  if (controls) controls.enabled = isFreeView;
}

function getStageSize() {
  const width = Math.max(1, webglLayer.clientWidth || stage.clientWidth);
  const height = Math.max(1, webglLayer.clientHeight || stage.clientHeight);
  return { width, height };
}

function resize() {
  if (!renderer || !camera) return;
  const { width, height } = getStageSize();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  if (camera.isPerspectiveCamera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function addWebGLLighting() {
  // The GLB contains the scene lights. These low-intensity fills only keep the
  // interactive preview readable on browsers that do not support every Blender light type.
  const fill = new THREE.HemisphereLight(0x9cc4ff, 0x142519, 0.2);
  const rim = new THREE.DirectionalLight(0xffd59a, 0.18);
  rim.position.set(-4, 8, 3);
  scene.add(fill, rim);
}

function createRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x020605, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.domElement.setAttribute("aria-label", "森林小狐狸 WebGL 3D 场景");
  webglLayer.appendChild(renderer.domElement);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(webglLayer);
  window.addEventListener("resize", resize);
}

function chooseCamera(gltf) {
  const namedCamera = gltf.cameras?.find((entry) => entry.name === "摄像机");
  return namedCamera || gltf.cameras?.[0] || null;
}

function frameIfNoCamera() {
  if (camera) return;
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5;
  camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, Math.max(500, radius * 20));
  camera.position.set(center.x, center.y + radius * 0.45, center.z + radius * 2.7);
  camera.lookAt(center);
  scene.add(camera);
}

function createControls() {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 0.2;
  controls.maxDistance = 220;
  const bounds = new THREE.Box3().setFromObject(model);
  bounds.getCenter(controls.target);
  controls.enabled = false;
}

function renderLoop(now) {
  const delta = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  if (mixer) mixer.update(delta);
  if (controls?.enabled) controls.update();
  if (renderer && scene && camera && is3DVisible) renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

async function load3DScene() {
  if (model) {
    showWebGLView();
    return;
  }
  if (isLoading) return;
  isLoading = true;
  setLoading(true);
  setStatus("正在载入完整 WebGL 场景，首次打开可能需要一点时间…");
  show3dButton.disabled = true;

  try {
    const [threeModule, loaderModule, dracoModule, controlsModule] = await Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/loaders/DRACOLoader.js"),
      import("three/addons/controls/OrbitControls.js"),
    ]);
    THREE = threeModule;
    const { GLTFLoader } = loaderModule;
    const { DRACOLoader } = dracoModule;
    const { OrbitControls } = controlsModule;
    THREE.OrbitControls = OrbitControls;

    createRenderer();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020605);
    addWebGLLighting();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/",
    );
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(
        "./assets/forest-fox.glb",
        resolve,
        (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setLoading(true, `正在加载 3D 场景… ${percent}%`);
          } else {
            setLoading(true, "正在加载 3D 场景…");
          }
        },
        reject,
      );
    });

    model = gltf.scene;
    scene.add(model);
    camera = chooseCamera(gltf);
    if (!camera) frameIfNoCamera();
    camera.updateMatrixWorld(true);
    createControls();
    mixer = gltf.animations?.length ? new THREE.AnimationMixer(model) : null;
    if (mixer) {
      for (const clip of gltf.animations) mixer.clipAction(clip).play();
    }
    resize();
    setLoading(false);
    showWebGLView();
    setStatus(
      gltf.animations?.length
        ? `WebGL 场景已载入 · ${gltf.animations.length} 个动画片段`
        : "WebGL 场景已载入 · 当前版本保持第 453 帧静态构图",
      "ok",
    );
  } catch (error) {
    console.error(error);
    setLoading(false);
    showCameraView();
    setStatus("3D 场景载入失败，已保留原摄像机画面。请确认浏览器可以访问 CDN。", "error");
  } finally {
    isLoading = false;
    show3dButton.disabled = false;
  }
}

show3dButton.addEventListener("click", load3DScene);
showCameraButton.addEventListener("click", showCameraView);
freeViewButton.addEventListener("click", () => {
  if (!model || !controls) return;
  isFreeView = !isFreeView;
  controls.enabled = isFreeView;
  freeViewButton.setAttribute("aria-pressed", String(isFreeView));
  freeViewButton.textContent = isFreeView ? "锁定摄像机视角" : "自由观察";
  stageBadge.textContent = isFreeView ? "WEBGL · FREE VIEW" : "WEBGL · CAMERA";
  viewerCaption.textContent = isFreeView
    ? "WebGL scene · free camera controls enabled"
    : "WebGL scene · embedded Blender camera";
  setStatus(isFreeView ? "已开启自由观察 · 拖动旋转，滚轮缩放" : "已锁定 Blender 摄像机视角", "ok");
});
fullscreenButton.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await stage.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    setStatus("当前浏览器不允许全屏操作。", "error");
  }
});

showCameraView();
requestAnimationFrame(renderLoop);

if (new URLSearchParams(window.location.search).get("mode") === "3d") {
  load3DScene();
}
