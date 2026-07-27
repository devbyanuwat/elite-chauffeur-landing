import { parseDepthField } from './contract';
import { canRunHeroDepth, pickTier } from './tiers';

/**
 * Hero WebGL depth field — ported from mockups/parallax-boss-hero.html.
 *
 * แทนภาพนิ่งด้วยระนาบเดียว sample สี + depth map แล้วเลื่อน UV ตามความลึก
 * (พิกเซลใกล้เดินทางไกลกว่าพิกเซลไกล) ผูกกับ pointer + scroll
 *
 * ไฟล์นี้เป็นจุดเดียวใน motion system ที่แตะ WebGL/three.js — components ตัวอื่น
 * ยังคุยผ่าน data-* attribute เท่านั้นตามกฎเดิม (contract.ts) ไม่มีที่ไหน import
 * gsap หรือ three ตรง ๆ นอกจากไฟล์นี้ (three) กับ index.ts (gsap)
 *
 * เกตสามชั้น (spec #4): กว้าง ≥ 1024px, prefers-reduced-motion: no-preference,
 * มี WebGL2 — ไม่ผ่านข้อใดข้อหนึ่ง = ไม่ import('three') เลย ปล่อย <img class="hero-bg-photo">
 * (สร้างไว้ใน markup อยู่แล้ว มองเห็นเสมอ) เป็นภาพหลักต่อไป โหลด texture ไม่สำเร็จก็เข้า
 * เคสเดียวกัน — ไม่เคยมีจังหวะที่ทั้งสองแบบไม่มีอะไรให้ดูเลย
 */

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform vec2 uOffset;
  uniform vec2 uAspect;
  uniform float uTime;
  uniform float uStrength;
  varying vec2 vUv;

  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
  }

  void main() {
    /* cover-fit the texture into the viewport */
    vec2 uv = (vUv - 0.5) * uAspect + 0.5;

    /* parallax: near pixels travel further than far ones */
    float d = texture2D(uDepth, uv).r;
    vec2 shifted = uv + uOffset * (d - 0.35) * uStrength;
    vec3 col = texture2D(uColor, shifted).rgb;

    /* haze on the far plane — reads as air, not as a filter */
    col = mix(col, vec3(0.976, 0.965, 0.941), (1.0 - d) * 0.28);

    /* film grain, printed-paper amount */
    col += (grain(vUv * 900.0) - 0.5) * 0.022;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function detectWebgl2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

async function mountDepthField(el: HTMLElement, THREE: typeof import('three')): Promise<void> {
  const spec = parseDepthField(el);
  if (!spec) return;

  const loader = new THREE.TextureLoader();
  const loadTexture = (url: string) =>
    new Promise<InstanceType<typeof THREE.Texture>>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

  let colorTex: InstanceType<typeof THREE.Texture>;
  let depthTex: InstanceType<typeof THREE.Texture>;
  try {
    [colorTex, depthTex] = await Promise.all([loadTexture(spec.colorUrl), loadTexture(spec.depthUrl)]);
  } catch (err) {
    // เจตนา: ไม่ mount canvas เลย — <img class="hero-bg-photo"> ที่อยู่ใน markup
    // อยู่แล้วยังเป็นภาพหลักต่อไป ไม่มีจอว่างจากความล้มเหลวนี้
    console.error('hero-depth: โหลด color/depth texture ไม่สำเร็จ ใช้รูปนิ่งแทน', err);
    return;
  }

  // SwiftShader (headless/software WebGL) สร้าง mipmap ของ non-power-of-two แล้วได้
  // แถบภาพความละเอียดต่ำที่ขอบ — ภาพเราเต็มเฟรมใกล้ระดับ native scale อยู่แล้ว ไม่ต้อง
  // ใช้ mipmap ปิดแล้วบังคับ bilinear ล้วนแทน
  [colorTex, depthTex].forEach((tex) => {
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
  });

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uColor: { value: colorTex },
    uDepth: { value: depthTex },
    uOffset: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uAspect: { value: new THREE.Vector2(1, 1) },
    uStrength: { value: spec.strength },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  // three's Texture.image type is `unknown` (it accepts HTMLImageElement,
  // HTMLCanvasElement, ImageBitmap, ...) — TextureLoader's default ImageLoader
  // always resolves to an HTMLImageElement, so width/height are safe to read.
  const image = colorTex.image as { width: number; height: number };
  const texW = image.width;
  const texH = image.height;

  function resize(): void {
    const rect = el.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    const texAspect = texW / texH;
    const boxAspect = rect.width / Math.max(rect.height, 1);
    // true cover-fit: crop the overflowing axis, never let uv leave [0,1]
    // (parallax-concept.html's placeholder had this ratio inverted — invisible on
    // flat placeholder art, visible banding on a real photo; fixed here from the start)
    uniforms.uAspect.value.set(
      boxAspect > texAspect ? 1 : boxAspect / texAspect,
      boxAspect > texAspect ? texAspect / boxAspect : 1
    );
  }

  resize();
  window.addEventListener('resize', resize);

  // pointer + scroll feed the same offset; both are lerped so nothing snaps
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(el);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const scrollPart = Math.min(window.scrollY / window.innerHeight, 1);
    current.x += (target.x - current.x) * 0.055;
    current.y += (target.y * 0.6 + scrollPart * 0.7 - current.y) * 0.055;
    uniforms.uOffset.value.set(current.x, current.y);
    uniforms.uTime.value += 0.016;
    renderer.render(scene, camera);
  });
}

export async function initHeroDepth(root: ParentNode = document): Promise<void> {
  const fields = Array.from(root.querySelectorAll<HTMLElement>('[data-depth-field]'));
  if (fields.length === 0) return;

  const tier = pickTier({
    viewportWidth: window.innerWidth,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  if (!canRunHeroDepth(tier, detectWebgl2())) return;

  const THREE = await import('three');
  await Promise.all(fields.map((field) => mountDepthField(field, THREE)));
}
