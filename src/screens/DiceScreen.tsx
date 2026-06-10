import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function parseRoll(expression: string) {
  const match = expression.replace(/\s+/g, "").match(/^(\d*)d(\d+|%)([+-]\d+)?$/i);
  if (!match) return null;

  const count = Number(match[1] || 1);
  const sides = match[2] === "%" ? 100 : Number(match[2]);
  const modifier = Number(match[3] || 0);
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  const total = rolls.reduce((sum, value) => sum + value, 0) + modifier;

  return { rolls, sides, modifier, total };
}

function createDieGeometry(sides: number) {
  if (sides === 2) return new THREE.CylinderGeometry(1.34, 1.34, 0.36, 72);
  if (sides === 3) return new THREE.CylinderGeometry(1.32, 1.32, 0.9, 3);
  if (sides === 4) return new THREE.TetrahedronGeometry(1.68, 0);
  if (sides === 6) return new THREE.BoxGeometry(2.05, 2.05, 2.05);
  if (sides === 8) return new THREE.OctahedronGeometry(1.68, 0);
  if (sides === 10) return createPentagonalBipyramidGeometry();
  if (sides === 12) return new THREE.DodecahedronGeometry(1.55, 0);
  if (sides === 100) return new THREE.SphereGeometry(1.52, 24, 14);
  return new THREE.IcosahedronGeometry(1.55, 0);
}

function createPentagonalBipyramidGeometry() {
  const radius = 1.34;
  const height = 1.72;
  const vertices: number[] = [0, height, 0, 0, -height, 0];
  const indices: number[] = [];

  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    vertices.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }

  for (let i = 0; i < 5; i += 1) {
    const current = i + 2;
    const next = ((i + 1) % 5) + 2;
    indices.push(0, current, next, 1, next, current);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createNumberTexture(text: string, size = 170, color = "#f0c35a") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.strokeStyle = "rgba(0, 0, 0, 0.72)";
  context.lineWidth = Math.max(10, size * 0.08);
  context.shadowColor = "rgba(255, 210, 82, 0.5)";
  context.shadowBlur = 18;
  context.font = `900 ${size}px Arial`;
  context.strokeText(text, 256, 258);
  context.fillText(text, 256, 258);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createDieBodyTexture(sides: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(150, 120, 20, 256, 260, 380);
  gradient.addColorStop(0, "#293527");
  gradient.addColorStop(0.34, "#121725");
  gradient.addColorStop(0.72, "#07090d");
  gradient.addColorStop(1, "#030405");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.42;
  for (let i = 0; i < 1600; i += 1) {
    const shade = 36 + Math.floor(Math.random() * 72);
    context.fillStyle = `rgb(${shade}, ${shade + 18}, ${shade - 10})`;
    context.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  context.globalAlpha = 0.26;
  context.strokeStyle = "#d7aa43";
  context.lineWidth = 2;
  for (let i = 0; i < 14; i += 1) {
    context.beginPath();
    context.moveTo(Math.random() * 512, Math.random() * 512);
    context.lineTo(Math.random() * 512, Math.random() * 512);
    context.stroke();
  }

  context.globalAlpha = 0.22;
  context.fillStyle = "#79ff5b";
  context.font = "900 58px Arial";
  context.fillText(`D${sides}`, 22, 76);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.needsUpdate = true;
  return texture;
}

function formatDieValue(sides: number, value: number) {
  if (sides === 100 && value === 100) return "00";
  return String(value);
}

function labelValueFor(sides: number, index: number, result: number) {
  if (index === 0) return result;
  if (sides === 100) return ((index * 10) % 100) || 100;
  return ((index - 1) % sides) + 1;
}

function getFaceLabelSpecs(sides: number, result: number) {
  const geometry = createDieGeometry(sides).toNonIndexed();
  const position = geometry.getAttribute("position");
  const specs: Array<{ value: number; position: THREE.Vector3; normal: THREE.Vector3; size: number }> = [
    {
      value: result,
      position: new THREE.Vector3(0, 0, 1.62),
      normal: new THREE.Vector3(0, 0, 1),
      size: sides === 100 ? 0.68 : 0.76,
    },
  ];
  const seen = new Set<string>();
  const centers: Array<{ position: THREE.Vector3; normal: THREE.Vector3; score: number }> = [];

  for (let i = 0; i < position.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, i);
    const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    const key = `${normal.x.toFixed(1)}:${normal.y.toFixed(1)}:${normal.z.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const center = new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3).multiplyScalar(1.035);
    centers.push({
      position: center,
      normal,
      score: normal.z * 2 + normal.y * 0.25 - Math.abs(normal.x) * 0.08,
    });
  }

  centers
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(sides === 100 ? 20 : sides, 22))
    .forEach((center, index) => {
      if (center.normal.z > 0.94) return;
      specs.push({
        value: labelValueFor(sides, index + 1, result),
        position: center.position,
        normal: center.normal,
        size: sides === 100 ? 0.34 : sides >= 20 ? 0.42 : 0.48,
      });
    });

  geometry.dispose();
  return specs;
}

function disposeLabelGroup(group: THREE.Group | null) {
  if (!group) return;
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const material = child.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
  });
  group.removeFromParent();
}

function buildLabelGroup(sides: number, result: number) {
  const group = new THREE.Group();
  getFaceLabelSpecs(sides, result).forEach((spec, index) => {
    const texture = createNumberTexture(
      formatDieValue(sides, spec.value),
      index === 0 ? 190 : sides === 100 ? 118 : 140,
      index === 0 ? "#fff2aa" : "#f0c35a"
    );
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.size, spec.size),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    mesh.position.copy(spec.position);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spec.normal.clone().normalize());
    group.add(mesh);
  });
  return group;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

type ThreeDieProps = {
  face: number;
  sides: number;
  rolling: boolean;
};

function ThreeDie({ face, sides, rolling }: ThreeDieProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const edgeRef = useRef<THREE.LineSegments | null>(null);
  const glowRef = useRef<THREE.Mesh | null>(null);
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>();
  const rollUntilRef = useRef(0);
  const rollStartRef = useRef(0);
  const rollDurationRef = useRef(2100);
  const velocityRef = useRef(new THREE.Vector3());
  const angularVelocityRef = useRef(new THREE.Vector3());
  const impactRef = useRef(0);
  const textureRef = useRef<THREE.Texture | null>(null);
  const rollingRef = useRef(rolling);
  const targetRotationRef = useRef(new THREE.Euler(-0.55, 0.72, 0.16));

  useEffect(() => {
    rollingRef.current = rolling;
  }, [rolling]);

  useEffect(() => {
    const currentHost = hostRef.current;
    if (!currentHost) return;
    const container: HTMLDivElement = currentHost;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.15, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xd9ffb8, 2.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffc75f, 1.15);
    rimLight.position.set(-4, -2, 2);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0x315528, 1.25));

    const bodyTexture = createDieBodyTexture(sides);
    textureRef.current = bodyTexture;

    const material = new THREE.MeshStandardMaterial({
      color: 0x111426,
      map: bodyTexture,
      emissive: 0x030409,
      emissiveIntensity: 0.35,
      metalness: 0.28,
      roughness: 0.42,
      flatShading: true,
    });

    const die = new THREE.Mesh(createDieGeometry(sides), material);
    die.rotation.copy(targetRotationRef.current);
    scene.add(die);
    meshRef.current = die;

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(die.geometry),
      new THREE.LineBasicMaterial({ color: 0xf0c35a, transparent: true, opacity: 0.9 })
    );
    edges.scale.setScalar(1.006);
    die.add(edges);
    edgeRef.current = edges;

    const glow = new THREE.Mesh(
      createDieGeometry(sides),
      new THREE.MeshBasicMaterial({
        color: 0x75ff58,
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
      })
    );
    glow.scale.setScalar(1.05);
    die.add(glow);
    glowRef.current = glow;

    const labels = buildLabelGroup(sides, face);
    die.add(labels);
    labelGroupRef.current = labels;

    const base = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 64),
      new THREE.MeshBasicMaterial({ color: 0x0b1808, transparent: true, opacity: 0.55 })
    );
    base.position.y = -1.76;
    base.rotation.x = -Math.PI / 2;
    base.scale.set(1.25, 0.36, 1);
    scene.add(base);

    function resize() {
      const rect = container.getBoundingClientRect();
      const width = Math.max(280, rect.width);
      const height = Math.max(260, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const clock = new THREE.Clock();
    function animate() {
      const delta = Math.min(clock.getDelta(), 0.032);
      const elapsed = clock.elapsedTime;
      const now = performance.now();
      const dieMesh = meshRef.current;

      if (dieMesh) {
        if (now < rollUntilRef.current) {
          const progress = clamp((now - rollStartRef.current) / rollDurationRef.current);
          const velocity = velocityRef.current;
          const angularVelocity = angularVelocityRef.current;
          const radius = sides === 2 ? 0.24 : sides === 3 ? 0.52 : sides === 6 ? 0.98 : 0.86;
          const gravity = 9.8;
          const airDrag = Math.pow(0.992, delta * 60);
          const floor = -0.05;

          const steps = Math.max(1, Math.ceil(delta / 0.008));
          const step = delta / steps;
          for (let i = 0; i < steps; i += 1) {
            velocity.y -= gravity * step;
            velocity.x *= Math.pow(0.992, step * 60);
            velocity.z *= Math.pow(0.992, step * 60);
            dieMesh.position.addScaledVector(velocity, step);

            angularVelocity.multiplyScalar(Math.pow(0.993, step * 60));
            dieMesh.rotation.x += angularVelocity.x * step;
            dieMesh.rotation.y += angularVelocity.y * step;
            dieMesh.rotation.z += angularVelocity.z * step;

            if (dieMesh.position.y <= floor + radius * 0.08 && velocity.y < 0) {
              const impact = clamp(Math.abs(velocity.y) / 7.4);
              const restitution = 0.24 + impact * 0.18;
              dieMesh.position.y = floor + radius * 0.08;
              velocity.y = -velocity.y * restitution;
              velocity.x *= 0.68 - impact * 0.06;
              velocity.z *= 0.68 - impact * 0.06;
              angularVelocity.x += velocity.z * (1.4 + impact * 1.3);
              angularVelocity.z -= velocity.x * (1.4 + impact * 1.3);
              angularVelocity.y *= 0.76;
              impactRef.current = Math.max(impactRef.current, impact);
            }

            if (dieMesh.position.y <= floor + radius * 0.1 && Math.abs(velocity.y) < 0.42) {
              velocity.y = 0;
              velocity.x *= Math.pow(0.78, step * 60);
              velocity.z *= Math.pow(0.78, step * 60);
              angularVelocity.multiplyScalar(Math.pow(0.86, step * 60));
            }
          }

          dieMesh.position.x = clamp(dieMesh.position.x, -1.35, 1.35);
          dieMesh.position.z = clamp(dieMesh.position.z, -0.35, 0.35);

          if (progress > 0.82) {
            const settle = clamp((progress - 0.82) / 0.18);
            const settlePull = 0.008 + settle * 0.032;
            dieMesh.rotation.x += (targetRotationRef.current.x - dieMesh.rotation.x) * settlePull;
            dieMesh.rotation.y += (targetRotationRef.current.y - dieMesh.rotation.y) * settlePull;
            dieMesh.rotation.z += (targetRotationRef.current.z - dieMesh.rotation.z) * settlePull;
            dieMesh.position.x += (0 - dieMesh.position.x) * settlePull;
            dieMesh.position.z += (0 - dieMesh.position.z) * settlePull;
            velocity.multiplyScalar(0.96);
            angularVelocity.multiplyScalar(0.955);
          }

          const squash = impactRef.current * 0.035;
          dieMesh.scale.set(1 + squash, 1 - squash * 0.45, 1 + squash);
          impactRef.current *= Math.pow(0.86, delta * 60);
        } else {
          const landing = impactRef.current;
          impactRef.current *= Math.pow(0.88, delta * 60);
          dieMesh.rotation.x += (targetRotationRef.current.x - dieMesh.rotation.x) * 0.06;
          dieMesh.rotation.y += (targetRotationRef.current.y - dieMesh.rotation.y) * 0.06;
          dieMesh.rotation.z += (targetRotationRef.current.z - dieMesh.rotation.z) * 0.06;
          dieMesh.position.x += (0 - dieMesh.position.x) * 0.08;
          dieMesh.position.y = Math.sin(elapsed * 1.4) * 0.035 + landing * 0.08;
          dieMesh.position.z += (0 - dieMesh.position.z) * 0.08;
          dieMesh.scale.set(
            1 + Math.sin(elapsed * 1.8) * 0.005 + landing * 0.018,
            1 + Math.cos(elapsed * 1.8) * 0.004,
            1 + Math.sin(elapsed * 1.8) * 0.005 + landing * 0.018
          );
        }

        base.scale.set(1.25 + Math.abs(dieMesh.position.y) * 0.2, 0.36 + Math.abs(dieMesh.position.y) * 0.055, 1);
        base.material.opacity = Math.max(0.18, 0.55 - Math.abs(dieMesh.position.y) * 0.22);
      }

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      disposeLabelGroup(labelGroupRef.current);
      die.geometry.dispose();
      material.dispose();
      edgeRef.current?.geometry.dispose();
      glowRef.current?.geometry.dispose();
      textureRef.current?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const die = meshRef.current;
    if (!die) return;

    const previousGeometry = die.geometry;
    die.geometry = createDieGeometry(sides);
    previousGeometry.dispose();

    const material = die.material as THREE.MeshStandardMaterial;
    textureRef.current?.dispose();
    textureRef.current = createDieBodyTexture(sides);
    material.map = textureRef.current;
    material.needsUpdate = true;

    if (edgeRef.current) {
      edgeRef.current.geometry.dispose();
      edgeRef.current.geometry = new THREE.EdgesGeometry(die.geometry);
    }

    if (glowRef.current) {
      glowRef.current.geometry.dispose();
      glowRef.current.geometry = createDieGeometry(sides);
      glowRef.current.scale.setScalar(1.05);
    }

    disposeLabelGroup(labelGroupRef.current);
    const labels = buildLabelGroup(sides, face);
    die.add(labels);
    labelGroupRef.current = labels;
  }, [face, sides]);

  useEffect(() => {
    if (!rolling) return;
    const now = performance.now();
    rollDurationRef.current = 1980 + Math.random() * 260;
    rollStartRef.current = now;
    rollUntilRef.current = now + rollDurationRef.current;
    velocityRef.current.set(
      (Math.random() > 0.5 ? -1 : 1) * (2.0 + Math.random() * 1.2),
      5.0 + Math.random() * 1.35,
      -0.8 + Math.random() * 1.6
    );
    angularVelocityRef.current.set(
      (Math.random() > 0.5 ? -1 : 1) * (13 + Math.random() * 7),
      (Math.random() > 0.5 ? -1 : 1) * (10 + Math.random() * 7),
      (Math.random() > 0.5 ? -1 : 1) * (12 + Math.random() * 7)
    );
    impactRef.current = 0.45;
    const die = meshRef.current;
    if (die) {
      die.position.set((Math.random() > 0.5 ? -1 : 1) * (0.75 + Math.random() * 0.4), 1.34, -0.12 + Math.random() * 0.24);
      die.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      die.scale.setScalar(1);
    }
    targetRotationRef.current = new THREE.Euler(
      -0.14 + Math.random() * 0.28,
      -0.22 + Math.random() * 0.44,
      -0.16 + Math.random() * 0.32
    );
  }, [rolling, face, sides]);

  return (
    <div className={`three-die-host die-sides-${sides}`} ref={hostRef}>
      <div className="three-die-result">
        <span>d{sides}</span>
        <strong>{face}</strong>
      </div>
    </div>
  );
}

export function DiceScreen() {
  const [expression, setExpression] = useState("2d20+3");
  const [face, setFace] = useState(20);
  const [sides, setSides] = useState(20);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const timeoutRef = useRef<number>();

  function roll(expr = expression) {
    const result = parseRoll(expr);
    if (!result) {
      setHistory((prev) => ["Expresion invalida", ...prev]);
      return;
    }

    const finalFace = result.rolls[result.rolls.length - 1];
    setSides(result.sides);
    setFace(finalFace);
    setRolling(true);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setRolling(false);
    }, 2240);

    setHistory((prev) => [`${expr}: [${result.rolls.join(", ")}] = ${result.total}`, ...prev]);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <section className="dice-layout-screen">
      <article className="dice-main-card">
        <h2>Herramienta de dados 3D</h2>
        <p>Dado poligonal real con Three.js, iluminacion y rotacion 3D.</p>

        <div className="dice-stage">
          <ThreeDie face={face} sides={sides} rolling={rolling} />
        </div>

        <div className="dice-buttons">
          {[2, 3, 4, 6, 8, 10, 12, 20, 100].map((option) => (
            <button
              key={option}
              className={sides === option ? "selected" : ""}
              onClick={() => {
                setExpression(`1d${option}`);
                roll(`1d${option}`);
              }}
            >
              d{option}
            </button>
          ))}
        </div>

        <div className="dice-expression">
          <input value={expression} onChange={(event) => setExpression(event.target.value)} />
          <button className="green-button" onClick={() => roll()}>
            Tirar
          </button>
        </div>
      </article>

      <article className="dice-history-card">
        <h3>Resultado / historial</h3>
        <div className="history-list">
          {history.length === 0 && <p>Aun no has tirado dados.</p>}
          {history.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      </article>
    </section>
  );
}
