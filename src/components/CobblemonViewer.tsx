'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { asset } from '@/lib/asset';

interface Props {
  modelUrl: string;
  textureUrl: string;
  shinyUrl: string | null;
  /** 待机动画（Bedrock animation json）；没有就只渲染静态姿态 */
  animationUrl?: string | null;
  /** 渲染附加数据（resolver layers + 展示姿势的 poser transformedParts），没有则为 null */
  renderUrl?: string | null;
  nameZh: string;
  /** 模型缺失时的说明（例如该物种在 Cobblemon 里尚未实装） */
  missingHint?: string;
  /** 模型来源标注，例如「Mega Showdown」 */
  source?: string;
}

type Status = 'loading' | 'ready' | 'missing' | 'error';

type FrameVal = number | string;

interface BoneTrack {
  bone: string;
  prop: 'rotation' | 'position' | 'scale';
  frames: { t: number; v: FrameVal[] }[];
  /** 所属动画片段的循环长度（秒）；多条待机动画叠加时各自按自己的长度取模 */
  len?: number;
}

interface AnimationSet {
  /** 静态姿势层：把四肢、耳朵摆到正确位置 */
  pose: BoneTrack[];
  /** 动态层：真正会变化的轨道（呼吸、眨眼、尾巴摆动） */
  motion: BoneTrack[] | null;
  /** 动态片段时长（秒） */
  length: number;
  /**
   * idle：本身就是一个连续的循环待机（含 molang 的正弦摆动），必须一直播、按 length 取模；
   * blink：只能是「偶尔播一次」的短片段，播完回到姿势层。
   */
  kind: 'idle' | 'blink' | 'none';
}

/** resolver 里的一条贴图层（由 scripts/extract-cobblemon.mjs 导出） */
interface LayerDef {
  name: string;
  emissive: boolean;
  translucent: boolean;
  fps: number;
  loop: boolean;
  frames: string[];
}

/** poser 展示姿势里的 transformedParts（数值为模组 Java 模型空间：Y 向下） */
interface PartDef {
  part: string;
  position?: number[];
  rotation?: number[];
  isVisible?: boolean;
}

interface RenderData {
  layers?: LayerDef[];
  shinyLayers?: LayerDef[];
  parts?: PartDef[];
}

/*
 * 坐标约定（与 Blockbench 导入 Bedrock 几何的换算逐条一致）：
 * Bedrock 几何的 X 轴与 three.js 右手系相反，所以
 *   位置 / pivot：     [x, y, z]    → [-x, y, z]
 *   旋转（度）：       [rx, ry, rz] → [-rx, -ry, rz]，顺序 Z→Y→X（three 'ZYX'）
 *   动画 position 通道：同位置；rotation 通道：同旋转；scale 不变
 * poser 的 transformedParts 写在 Java 模型空间（相对 Bedrock 再把 Y 翻转）：
 *   position [x, y, z] → [-x, -y, z]；rotation 与 Bedrock 角度相同 → [-rx, -ry, rz]
 * 换算后模型正脸朝 -Z（north），box-uv 六面：+X←east、-X←west、+Y←up、-Y←down、-Z←north、+Z←south。
 */
const toPos = (v?: number[] | null): number[] => (v ? [-(v[0] || 0), v[1] || 0, v[2] || 0] : [0, 0, 0]);
const toRot = (v?: number[] | null): number[] => (v ? [-(v[0] || 0), -(v[1] || 0), v[2] || 0] : [0, 0, 0]);

/**
 * 把 Cobblemon（方可梦）的 Bedrock geometry + 贴图 + 待机动画渲染成可旋转的 3D 像素模型。
 *
 * 渲染以数据为准：几何、UV、骨骼姿态全部来自 geo / animation / resolver / poser 的数值，
 * 不做任何按物种或按观感的修正。贴图是「纯二值 alpha」的调色板图，用 alphaTest 做镂空（cutout）。
 */
export default function CobblemonViewer({
  modelUrl,
  textureUrl,
  shinyUrl,
  animationUrl,
  renderUrl,
  nameZh,
  missingHint,
  source,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const disposeRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<Status>('loading');
  const [shiny, setShiny] = useState(false);
  const [animated, setAnimated] = useState(false);
  // ?stage=light renders on paper instead of the dark exhibition wall
  // (used when pre-rendering form thumbnails for the dex grid).
  const [light, setLight] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('stage') === 'light') {
      setLight(true);
    }
  }, []);

  const build = useCallback(
    async (isShiny: boolean) => {
      const mount = mountRef.current;
      if (!mount) return;
      setStatus('loading');
      try {
        const THREE = await import('three');
        const geoUrl = asset(modelUrl);
        const texUrl = asset(isShiny && shinyUrl ? shinyUrl : textureUrl);
        const getJson = (url?: string | null) =>
          url ? fetch(asset(url)).then(r => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null);

        const [res, anim, renderData] = await Promise.all([
          fetch(geoUrl),
          getJson(animationUrl),
          getJson(renderUrl) as Promise<RenderData | null>,
        ]);
        if (!res.ok) {
          setStatus('missing');
          return;
        }
        const geo = await res.json();
        const body = geo['minecraft:geometry']?.[0];
        if (!body?.bones) {
          setStatus('missing');
          return;
        }

        disposeRef.current?.();
        mount.innerHTML = '';
        let disposed = false;

        const params = new URLSearchParams(window.location.search);
        const FACE_DEBUG = params.has('faces');
        const still = params.get('still') === '1';

        const desc = body.description || {};
        const tw = desc.texture_width || 64;
        const th = desc.texture_height || 64;
        const width = mount.clientWidth || 420;
        const height = mount.clientHeight || 420;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: still });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.style.touchAction = 'none';
        renderer.domElement.style.cursor = 'grab';
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, width / height, 0.05, 500);

        const loader = new THREE.TextureLoader();
        const pixelTexture = (t: any) => {
          t.magFilter = THREE.NearestFilter;
          t.minFilter = THREE.NearestFilter;
          t.colorSpace = THREE.SRGBColorSpace;
          t.generateMipmaps = false;
          return t;
        };
        const texture = pixelTexture(await loader.loadAsync(texUrl));

        // 绕序在 buildBoxGeometry 里统一为「从外侧看逆时针」，所以只画正面：
        // 零厚度贴片的 north/south 两面共面，双面渲染会让它们互相打架。
        const material = new THREE.MeshLambertMaterial({
          map: FACE_DEBUG ? null : texture,
          vertexColors: FACE_DEBUG,
          transparent: false,
          alphaTest: 0.5,
          side: THREE.FrontSide,
          depthWrite: true,
        });

        // ── 骨骼：pivot / 绑定旋转按 Bedrock→three 换算，poser 的 transformedParts 叠加在绑定姿态上 ──
        const model = new THREE.Group();
        const boneByName = new Map<string, any>();
        for (const b of body.bones) boneByName.set(b.name, b);
        const groups = new Map<string, any>();
        /** 每根骨骼的静止姿态（绑定 + poser 变换）：位置为 three 单位，旋转为度 */
        const rest = new Map<string, { pos: number[]; rot: number[] }>();
        const partByBone = new Map<string, PartDef>();
        for (const p of renderData?.parts ?? []) partByBone.set(p.part, p);

        const DEG = Math.PI / 180;
        const setRot = (g: any, deg: number[]) => g.rotation.set(deg[0] * DEG, deg[1] * DEG, deg[2] * DEG, 'ZYX');

        for (const b of body.bones) {
          const g = new THREE.Group();
          g.name = b.name;
          groups.set(b.name, g);
          const pivot = toPos(b.pivot);
          const pp = b.parent && boneByName.has(b.parent) ? toPos(boneByName.get(b.parent).pivot) : [0, 0, 0];
          const pos = [pivot[0] - pp[0], pivot[1] - pp[1], pivot[2] - pp[2]];
          const rot = toRot(b.rotation);
          const part = partByBone.get(b.name);
          if (part?.position) {
            const [x, y, z] = part.position;
            pos[0] += -x;
            pos[1] += -y;
            pos[2] += z;
          }
          if (part?.rotation) {
            const r = toRot(part.rotation);
            rot[0] += r[0];
            rot[1] += r[1];
            rot[2] += r[2];
          }
          g.position.set(pos[0], pos[1], pos[2]);
          setRot(g, rot);
          rest.set(b.name, { pos, rot });
        }
        for (const b of body.bones) {
          const g = groups.get(b.name)!;
          if (b.parent && groups.has(b.parent)) groups.get(b.parent)!.add(g);
          else model.add(g);
        }

        for (const b of body.bones) {
          if (!b.cubes) continue;
          const g = groups.get(b.name)!;
          const bonePivot = toPos(b.pivot);
          for (const cube of b.cubes) addCube(THREE, g, cube, bonePivot, material, tw, th, cube.mirror ?? b.mirror ?? false, FACE_DEBUG);
        }

        // 眼睑 / 睫毛是模组 poser 在睁眼时缩放为 0 的部件（既有约定），默认隐藏；?lids=1 可显示
        if (params.get('lids') !== '1') {
          for (const b of body.bones) {
            if (/eyelid|eye_lid|eyelash/i.test(b.name)) groups.get(b.name)!.visible = false;
          }
        }
        // poser 展示姿势里的显隐（例如鸟类「收翅 / 展翅」两套翅膀只显示一套）
        for (const p of renderData?.parts ?? []) {
          const g = groups.get(p.part);
          if (g && typeof p.isVisible === 'boolean') g.visible = p.isVisible;
        }

        // ── 动画：Bedrock 语义，通道值是相对静止姿态的局部增量；同一骨骼上的多条轨道相加 ──
        const animSet = parseAnimation(anim);
        const hasMotion = !!animSet.motion;

        const acc = new Map<string, { rot: number[]; pos: number[]; scale: number[] }>();
        const applyTracks = (layers: { list: BoneTrack[]; t: number }[]) => {
          acc.clear();
          for (const { list, t } of layers) {
            for (const tr of list) {
              if (!groups.has(tr.bone) || !rest.has(tr.bone)) continue;
              let a = acc.get(tr.bone);
              if (!a) acc.set(tr.bone, (a = { rot: [0, 0, 0], pos: [0, 0, 0], scale: [1, 1, 1] }));
              const v = sampleTrack(tr.frames, tr.len ? t % tr.len : t);
              if (tr.prop === 'rotation') {
                const r = toRot(v);
                for (let i = 0; i < 3; i++) a.rot[i] += r[i];
              } else if (tr.prop === 'position') {
                const p = toPos(v);
                for (let i = 0; i < 3; i++) a.pos[i] += p[i];
              } else {
                const sx = v[0] ?? 1;
                const s = [sx, v[1] ?? sx, v[2] ?? sx];
                for (let i = 0; i < 3; i++) a.scale[i] *= s[i];
              }
            }
          }
          for (const [name, a] of acc) {
            const g = groups.get(name);
            const base = rest.get(name)!;
            setRot(g, [base.rot[0] + a.rot[0], base.rot[1] + a.rot[1], base.rot[2] + a.rot[2]]);
            g.position.set(base.pos[0] + a.pos[0], base.pos[1] + a.pos[1], base.pos[2] + a.pos[2]);
            g.scale.set(a.scale[0], a.scale[1], a.scale[2]);
          }
        };
        const touched = new Set([...animSet.pose, ...(animSet.motion ?? [])].map(tr => tr.bone));
        const resetBones = () => {
          for (const name of touched) {
            const g = groups.get(name);
            const r = rest.get(name);
            if (!g || !r) continue;
            g.position.set(r.pos[0], r.pos[1], r.pos[2]);
            setRot(g, r.rot);
            g.scale.set(1, 1, 1);
          }
        };

        const BLINK_CYCLE = 5.2; // 眨眼每 5.2 秒一次；连续的待机循环（kind==='idle'）则一直播、按 length 取模
        const noAnim = params.get('noanim') === '1';
        const applyIdle = (elapsed: number) => {
          if (noAnim) return;
          resetBones();
          const layers: { list: BoneTrack[]; t: number }[] = [];
          if (animSet.pose.length) layers.push({ list: animSet.pose, t: 0 });
          const m = animSet.motion;
          if (m && animSet.length) {
            if (animSet.kind === 'idle') {
              // 每条轨道按所属片段的长度取模（见 BoneTrack.len）
              layers.push({ list: m, t: elapsed });
            } else {
              // 眨眼：只在每个周期末尾的窗口内播（t=0 是睁眼的静止姿态），窗口外用姿势层
              const phase = elapsed % BLINK_CYCLE;
              const start = BLINK_CYCLE - animSet.length;
              if (phase >= start) layers.push({ list: m, t: phase - start });
            }
          }
          applyTracks(layers);
        };
        applyIdle(0);

        // ── 取景：按 t=0 姿态下「可见部件」的包围盒居中、归一化 ──
        model.updateMatrixWorld(true);
        const box = new THREE.Box3();
        const tmp = new THREE.Box3();
        const isShown = (o: any) => {
          for (let p = o; p; p = p.parent) if (!p.visible) return false;
          return true;
        };
        const baseMeshes: any[] = [];
        model.traverse((o: any) => {
          if (!o.isMesh) return;
          baseMeshes.push(o);
          if (!isShown(o)) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
          box.union(tmp);
        });
        if (box.isEmpty()) box.setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -center.y, -center.z);

        const pivot = new THREE.Group();
        pivot.add(model);
        scene.add(pivot);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        pivot.scale.setScalar(2.4 / maxDim);

        // 单一常量朝向：模型正脸朝 -Z，整体转 180° 正对相机。?yaw=<度> 在此基础上偏转（调试 / 截图用）
        let rotY = Math.PI + (Number(params.get('yaw')) || 0) * DEG;
        let rotX = 0;
        pivot.rotation.y = rotY;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3555, 1.45));
        const key = new THREE.DirectionalLight(0xffffff, 1.9);
        key.position.set(3, 6, 6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x86b4ff, 0.9);
        rim.position.set(-5, 2, -4);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0xffd9a0, 0.45);
        fill.position.set(-3, -4, 3);
        scene.add(fill);

        camera.position.set(0, 0, 5.4);
        camera.lookAt(0, 0, 0);

        // ── resolver layers：几何只建一次，每层克隆 Mesh 共享 geometry，挂在原 mesh 下随骨骼运动 ──
        const layerState: { mat: any; texs: any[]; fps: number; loop: boolean; cur: number }[] = [];
        const layerDefs = (isShiny && renderData?.shinyLayers ? renderData.shinyLayers : renderData?.layers) ?? [];
        const dir = modelUrl.slice(0, modelUrl.lastIndexOf('/') + 1);
        const loadLayers = async () => {
          if (FACE_DEBUG || params.get('layers') === '0' || !layerDefs.length) return;
          for (const def of layerDefs) {
            const texs = await Promise.all(def.frames.map(f => loader.loadAsync(asset(dir + f)).then(pixelTexture)));
            if (disposed) {
              texs.forEach(t => t.dispose());
              return;
            }
            const common = {
              map: texs[0],
              transparent: def.translucent,
              alphaTest: def.translucent ? 0.01 : 0.5,
              side: THREE.FrontSide,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1,
            };
            const mat = def.emissive
              ? new THREE.MeshBasicMaterial({ ...common, depthWrite: false, toneMapped: false })
              : new THREE.MeshLambertMaterial({ ...common, depthWrite: !def.translucent });
            for (const m of baseMeshes) {
              const overlay = new THREE.Mesh(m.geometry, mat);
              overlay.name = `layer:${def.name}`;
              overlay.renderOrder = 1;
              m.add(overlay);
            }
            layerState.push({ mat, texs, fps: def.fps, loop: def.loop, cur: 0 });
          }
        };
        const layersReady = loadLayers().catch(e => console.warn('[CobblemonViewer] layers', e));

        // 拖拽
        let dragging = false;
        let lastX = 0;
        let lastY = 0;
        let vel = 0.007;
        let last = 0;
        const onDown = (e: PointerEvent) => {
          dragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
          renderer.domElement.style.cursor = 'grabbing';
          renderer.domElement.setPointerCapture(e.pointerId);
        };
        const onMove = (e: PointerEvent) => {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          rotY += dx * 0.01;
          rotX = Math.max(-0.85, Math.min(0.85, rotX + dy * 0.006));
          vel = dx * 0.01;
        };
        const onUp = () => {
          dragging = false;
          renderer.domElement.style.cursor = 'grab';
        };
        renderer.domElement.addEventListener('pointerdown', onDown);
        renderer.domElement.addEventListener('pointermove', onMove);
        renderer.domElement.addEventListener('pointerup', onUp);
        renderer.domElement.addEventListener('pointercancel', onUp);

        let visible = true;
        const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
        io.observe(mount);

        let raf = 0;
        const tick = (now: number) => {
          raf = requestAnimationFrame(tick);
          if (!visible) return;
          // still=1：不自转、时间冻结在 t=0，同一参数的渲染结果可复现
          if (!dragging && !still) {
            rotY += vel;
            vel += (0.007 - vel) * 0.03;
          }
          pivot.rotation.y = rotY;
          pivot.rotation.x = rotX;
          if (!last) last = now;
          const elapsed = still ? 0 : (now - last) / 1000;
          applyIdle(elapsed);
          for (const L of layerState) {
            if (L.texs.length < 2 || !L.fps) continue;
            const n = L.texs.length;
            const f = Math.floor(elapsed * L.fps);
            const idx = L.loop ? f % n : Math.min(n - 1, f);
            if (idx !== L.cur) {
              L.cur = idx;
              L.mat.map = L.texs[idx];
              L.mat.needsUpdate = true;
            }
          }
          renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(tick);

        const onResize = () => {
          const w = mount.clientWidth || width;
          const h = mount.clientHeight || height;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(onResize);
        ro.observe(mount);

        disposeRef.current = () => {
          disposed = true;
          cancelAnimationFrame(raf);
          io.disconnect();
          ro.disconnect();
          renderer.domElement.removeEventListener('pointerdown', onDown);
          renderer.domElement.removeEventListener('pointermove', onMove);
          renderer.domElement.removeEventListener('pointerup', onUp);
          renderer.domElement.removeEventListener('pointercancel', onUp);
          renderer.dispose();
          texture.dispose();
          material.dispose();
          for (const L of layerState) {
            L.mat.dispose();
            L.texs.forEach(t => t.dispose());
          }
          for (const m of baseMeshes) m.geometry.dispose();
          mount.innerHTML = '';
          disposeRef.current = () => {};
        };

        setAnimated(hasMotion);
        setStatus('ready');
        await layersReady;
        if (!disposed) mount.dataset.layers = String(layerState.length);
      } catch (e) {
        console.error('[CobblemonViewer]', e);
        setStatus('error');
      }
    },
    [modelUrl, textureUrl, shinyUrl, animationUrl, renderUrl],
  );

  useEffect(() => {
    build(shiny);
    return () => disposeRef.current?.();
  }, [build, shiny]);

  return (
    <div className={'relative aspect-square w-full overflow-hidden border border-line ' + (light ? 'bg-paper' : 'bg-ink')}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: light
            ? 'none'
            : 'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div ref={mountRef} className="absolute inset-0" />

      <span className={'label pointer-events-none absolute left-3 top-3 ' + (light ? 'text-muted' : 'text-white/35')}>
        Cobblemon 3D
      </span>
      <span className={'label pointer-events-none absolute bottom-3 left-3 ' + (light ? 'text-muted' : 'text-white/35')}>
        {animated ? '拖拽旋转 · 待机动画' : '拖拽旋转'}
      </span>
      {source && source !== 'Cobblemon' && (
        <span className="pointer-events-none absolute bottom-3 right-3 border border-white/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
          {source}
        </span>
      )}

      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin border border-white/25 border-t-white" />
            <span className="label text-white/45">Loading</span>
          </div>
        </div>
      )}

      {status === 'missing' && (
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 p-5">
          <p className="text-[13px] font-medium text-white">{nameZh} 暂无方可梦建模</p>
          <p className="max-w-[85%] text-[11px] leading-relaxed text-white/45">
            {missingHint ?? 'Cobblemon 尚未收录这一只，暂时只能用官方原画参考。'}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-3 p-5">
          <p className="text-[13px] font-medium text-white">建模加载失败</p>
          <button
            className="border border-white/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70 transition hover:border-white hover:text-white"
            onClick={() => build(shiny)}
          >
            重试
          </button>
        </div>
      )}

      {status === 'ready' && shinyUrl && (
        <button
          onClick={() => setShiny(v => !v)}
          className={`absolute right-3 top-3 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
            shiny ? 'border-lemon bg-lemon text-ink' : 'border-white/25 text-white/55 hover:border-white/70 hover:text-white'
          }`}
          title="切换闪光贴图"
        >
          ✦ 闪光
        </button>
      )}
    </div>
  );
}

/**
 * 求值动画里的 molang 表达式（如 "12.5+math.sin(q.anim_time*90*4-45)*2"）。
 * 只放行数字、四则运算、括号与 math.* 白名单，其余一律返回 null —— 保证不会注入任意代码。
 */
const MOLANG_CHARS = /^[0-9\s.+\-*/(),]+$/;

/** Molang 的三角函数以「度」为单位（Minecraft 的 math.sin 不是弧度），换算错会变成高频抖动 */
const DEG = Math.PI / 180;
const molangFns = {
  sin: (x: number) => Math.sin(x * DEG),
  cos: (x: number) => Math.cos(x * DEG),
  tan: (x: number) => Math.tan(x * DEG),
};

function evalMolang(x: unknown, t: number): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x !== 'string') return null;
  const expr = x.trim();
  if (!expr) return null;
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);

  const stripped = expr
    .replace(/q\.anim_time/g, '')
    .replace(/math\.(sin|cos|tan|asin|acos|atan|abs|round|floor|ceil|sqrt|pow|pi)/g, '');
  if (!MOLANG_CHARS.test(stripped)) return null;

  const src = expr
    .replace(/q\.anim_time/g, `(${t})`)
    .replace(/\bmath\.pi\b/g, 'Math.PI')
    .replace(/math\.(sin|cos|tan)\(/g, (_, fn: string) => `F.${fn}(`)
    .replace(/math\.(abs|round|floor|ceil|sqrt|pow)\(/g, 'Math.$1(');
  try {
    const v = Number(new Function('F', `"use strict";return (${src});`)(molangFns));
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * 解析 Bedrock animation json，返回两层：
 * - pose：ground_idle / pose 这类「静态姿势」（把四肢摆到位，很多模型只有这一层）
 * - motion：真正会动的片段。优先 ground_idle；若它是纯静态（如伊布系），退到 blink 这类短动画，
 *   由渲染循环按「眨眼窗口」周期性播放，避免整只模型纹丝不动。
 */
function parseAnimation(json: any): AnimationSet {
  const anims = json?.animations;
  const empty: AnimationSet = { pose: [], motion: null, length: 0, kind: 'none' };
  if (!anims || typeof anims !== 'object') return empty;
  const names = Object.keys(anims);
  if (!names.length) return empty;

  const build = (anim: any): { tracks: BoneTrack[]; maxT: number } => {
    const tracks: BoneTrack[] = [];
    let maxT = 0;

    const push = (bone: string, prop: BoneTrack['prop'], raw: any) => {
      const frames: { t: number; v: FrameVal[] }[] = [];
      // 数值保持不变，molang 字符串留到采样时按当前 anim_time 求值（否则正弦表达式会被冻在 t=0）
      // Bedrock 允许把三个分量相同的通道简写成一个标量（常见于 scale）
      const vec = (val: any): FrameVal[] | null => {
        if (typeof val === 'number' || typeof val === 'string') return [val, val, val];
        if (!Array.isArray(val)) return null;
        return val.map(x => (typeof x === 'number' && Number.isFinite(x) ? x : typeof x === 'string' ? x : 0));
      };
      if (Array.isArray(raw) || typeof raw === 'number' || typeof raw === 'string') {
        const v = vec(raw);
        if (v) frames.push({ t: 0, v });
      } else if (raw && typeof raw === 'object') {
        for (const [k, val] of Object.entries(raw)) {
          const t = Number(k);
          if (!Number.isFinite(t)) continue;
          const target =
            val && typeof val === 'object' && !Array.isArray(val) ? ((val as any).post ?? (val as any).pre) : val;
          const v = vec(target);
          if (!v) continue;
          frames.push({ t, v });
          if (t > maxT) maxT = t;
        }
      }
      if (!frames.length) return;
      frames.sort((a, b) => a.t - b.t);
      tracks.push({ bone, prop, frames });
    };

    for (const [bone, ch] of Object.entries<any>(anim?.bones ?? {})) {
      if (!ch) continue;
      push(bone, 'rotation', ch.rotation);
      push(bone, 'position', ch.position);
      push(bone, 'scale', ch.scale);
    }
    return { tracks, maxT };
  };

  // 待机动画：优先用抽取脚本按 poser 展示姿势标注的那几条（可能多条叠加），
  // 没有标注时才按名字猜 ground_idle → *idle → *pose
  const marked: string[] = Array.isArray(json?.pokewiki?.idle) ? json.pokewiki.idle.filter((n: string) => anims[n]) : [];
  const guessed =
    names.find(n => /ground_idle$/i.test(n)) ??
    names.find(n => /idle$/i.test(n)) ??
    names.find(n => /pose$/i.test(n));
  const idleNames = marked.length ? marked : guessed ? [guessed] : [];
  const lengthOf = (n: string, maxT: number, fb: number) => Number(anims[n]?.animation_length) || maxT || fb;
  const idle = { tracks: [] as BoneTrack[], maxLen: 0 };
  for (const n of idleNames) {
    const b = build(anims[n]);
    const len = lengthOf(n, b.maxT, 2);
    for (const tr of b.tracks) tr.len = len;
    idle.tracks.push(...b.tracks);
    idle.maxLen = Math.max(idle.maxLen, len);
  }

  /** 关键帧 >1、或含 molang 字符串，才算「会动」 */
  const isDynamic = (tracks: BoneTrack[]) =>
    tracks.some(tr => tr.frames.length > 1 || tr.frames.some(f => f.v.some(x => typeof x === 'string')));

  if (idle.tracks.length && isDynamic(idle.tracks)) {
    return { pose: [], motion: idle.tracks, length: idle.maxLen, kind: 'idle' };
  }

  // 静态姿势 + 找一个短促的动态片段（眨眼、呼吸、尾巴摆动）
  const candidate = names
    .filter(n => !idleNames.includes(n) && /blink|breathe|tail|idle/i.test(n))
    .map(n => ({ n, ...build(anims[n]) }))
    .find(x => x.tracks.length && isDynamic(x.tracks));

  if (candidate) {
    return {
      pose: idle.tracks,
      motion: candidate.tracks,
      length: Number(anims[candidate.n]?.animation_length) || candidate.maxT || 0.3,
      kind: 'blink',
    };
  }
  return { pose: idle.tracks, motion: null, length: 0, kind: 'none' };
}

/** 采样；循环轨道由调用方对时间取模。molang 分量按当前时间实时求值，数值分量线性插值 */
function sampleTrack(frames: { t: number; v: FrameVal[] }[], t: number): number[] {
  const at = (raw: FrameVal | undefined): number => (raw === undefined ? 0 : evalMolang(raw, t) ?? 0);
  const resolve = (frame: { v: FrameVal[] }) => frame.v.map(x => at(x));

  if (frames.length === 1) return resolve(frames[0]);
  if (t <= frames[0].t) return resolve(frames[0]);
  const last = frames[frames.length - 1];
  if (t >= last.t) return resolve(last);

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const k = (t - a.t) / span;
      const out: number[] = [];
      const n = Math.max(a.v.length, b.v.length);
      for (let j = 0; j < n; j++) {
        const an = at(a.v[j]);
        const bn = at(b.v[j]);
        out.push(an + (bn - an) * k);
      }
      return out;
    }
  }
  return resolve(last);
}

/**
 * 按 Bedrock cube 数据建一个长方体并挂到骨骼上。
 * origin 是 cube 在 Bedrock 坐标里的最小角；换算到 three 后 X 翻转，最小角变成 -(origin.x + size.x)。
 * inflate 只放大几何，不改变 box-uv 的展开尺寸。
 */
function addCube(THREE: any, parent: any, cube: any, bonePivot: number[], material: any, tw: number, th: number, mirror: boolean, debug: boolean) {
  const origin = cube.origin || [0, 0, 0];
  const rawSize: number[] = cube.size || [0, 0, 0];
  const inflate = cube.inflate || 0;
  const size = rawSize.map(v => Math.max(v + inflate * 2, 0));
  const center = [-(origin[0] + rawSize[0] / 2), origin[1] + rawSize[1] / 2, origin[2] + rawSize[2] / 2];

  const geometry = buildBoxGeometry(THREE, size, rawSize, cube.uv, mirror, tw, th, debug);
  const mesh = new THREE.Mesh(geometry, material);

  const rot = toRot(cube.rotation);
  if (rot[0] || rot[1] || rot[2]) {
    const cubePivot = cube.pivot ? toPos(cube.pivot) : center;
    const holder = new THREE.Group();
    holder.position.set(cubePivot[0] - bonePivot[0], cubePivot[1] - bonePivot[1], cubePivot[2] - bonePivot[2]);
    holder.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG, 'ZYX');
    mesh.position.set(center[0] - cubePivot[0], center[1] - cubePivot[1], center[2] - cubePivot[2]);
    holder.add(mesh);
    parent.add(holder);
  } else {
    mesh.position.set(center[0] - bonePivot[0], center[1] - bonePivot[1], center[2] - bonePivot[2]);
    parent.add(mesh);
  }
}

// 六个面：outward 法线 + 贴图面板左上、右上、右下、左下四个角在 cube 局部坐标里的符号。
// 取向与 Minecraft ModelPart.Cube 的 box-uv 一致（north 从正前方看不镜像，up 的下边接 north 的上边……）
const FACES: { n: number[]; corners: number[][] }[] = [
  { n: [1, 0, 0], corners: [[1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1]] }, // +X east
  { n: [-1, 0, 0], corners: [[-1, 1, -1], [-1, 1, 1], [-1, -1, 1], [-1, -1, -1]] }, // -X west
  { n: [0, 1, 0], corners: [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]] }, // +Y up
  { n: [0, -1, 0], corners: [[1, -1, 1], [-1, -1, 1], [-1, -1, -1], [1, -1, -1]] }, // -Y down
  { n: [0, 0, 1], corners: [[-1, 1, 1], [1, 1, 1], [1, -1, 1], [-1, -1, 1]] }, // +Z south
  { n: [0, 0, -1], corners: [[1, 1, -1], [-1, 1, -1], [-1, -1, -1], [1, -1, -1]] }, // -Z north
];
/** 角点 0→1→2 从外侧看是否逆时针：(c1-c0)×(c2-c0) 与法线同向 */
const FACE_CCW = FACES.map(({ n, corners: [a, b, c] }) => {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const x = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  return x[0] * n[0] + x[1] * n[1] + x[2] * n[2] > 0;
});
// 调试（?faces=1）：+X 红 / -X 绿 / +Y 蓝 / -Y 黄 / +Z 品红 / -Z 青
const FACE_COLORS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1]];

/**
 * Bedrock box-uv 长方体。uv=[u,v]，展开尺寸为未 inflate 的 [w,h,d]：
 *   east [u, v+d, d, h] · north [u+d, v+d, w, h] · west [u+d+w, v+d, d, h] · south [u+2d+w, v+d, w, h]
 *   up [u+d, v, w, d] · down [u+d+w, v, w, d]
 * mirror=true：贴图沿 YZ 平面镜像 —— east/west 面板互换，且每个面水平翻转（只改 UV，不动顶点）。
 */
function buildBoxGeometry(THREE: any, size: number[], uvSize: number[], uv: any, mirror: boolean, tw: number, th: number, debug: boolean) {
  const [w, h, d] = uvSize;
  const [u, v] = Array.isArray(uv) ? uv : [0, 0];
  const rects: number[][] = [
    [u, v + d, d, h], // east  → +X
    [u + d + w, v + d, d, h], // west  → -X
    [u + d, v, w, d], // up    → +Y
    [u + d + w, v, w, d], // down  → -Y
    [u + d + w + d, v + d, w, h], // south → +Z
    [u + d, v + d, w, h], // north → -Z
  ];
  if (mirror) {
    const t = rects[0];
    rects[0] = rects[1];
    rects[1] = t;
  }

  const half = size.map(x => x / 2);
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  FACES.forEach((face, fi) => {
    const axis = face.n.findIndex(x => x !== 0);
    // 面积为 0 的面（零厚度贴片的侧边）没有可见像素，跳过
    const area = size.filter((_, i) => i !== axis).reduce((a, b) => a * b, 1);
    if (area <= 0) return;
    const [rx, ry, rw, rh] = rects[fi];
    let u1 = rx / tw;
    let u2 = (rx + rw) / tw;
    if (mirror) [u1, u2] = [u2, u1];
    const v1 = 1 - ry / th;
    const v2 = 1 - (ry + rh) / th;
    const uvCorners = [[u1, v1], [u2, v1], [u2, v2], [u1, v2]];
    const base = positions.length / 3;
    face.corners.forEach((c, i) => {
      positions.push(c[0] * half[0], c[1] * half[1], c[2] * half[2]);
      uvs.push(uvCorners[i][0], uvCorners[i][1]);
      normals.push(face.n[0], face.n[1], face.n[2]);
      if (debug) colors.push(...FACE_COLORS[fi]);
    });
    // three 的正面是「从外侧看逆时针」。四个角按贴图左上→右上→右下→左下排列，
    // 多数面从外侧看是顺时针，down 面是逆时针 —— 用叉积对照 outward 法线决定连法。
    indices.push(...(FACE_CCW[fi] ? [base, base + 1, base + 2, base, base + 2, base + 3] : [base, base + 3, base + 2, base, base + 2, base + 1]));
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (debug) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}
