// 이미지 기반 TV 전환. WebGL을 사용할 수 없으면 CSS 확대와 Canvas 속도선을 사용합니다.
(function () {
  "use strict";
  const overlay = document.querySelector("signal-transition.tv-warp");
  if (!overlay) return;
  const KEY = "echo-tv-warp-arrival-v1";
  const DURATION = 720;
  // 각 단계의 비율은 유지하고 전체 재생 시간을 두 배로 늘립니다.
  const TIME_SCALE = 2;
  let active = false;
  let committed = false;
  let frame = 0;
  let renderer = null;
  let finishCurrent = null;
  const timers = new Set();
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  function later(callback, delay) {
    const id = setTimeout(() => { timers.delete(id); callback(); }, delay);
    timers.add(id);
    return id;
  }
  function stopWork() {
    cancelAnimationFrame(frame);
    timers.forEach(clearTimeout);
    timers.clear();
    if (renderer) renderer.dispose();
    renderer = null;
  }
  function reset() {
    stopWork();
    active = false;
    committed = false;
    finishCurrent = null;
    overlay.hidden = true;
    overlay.classList.remove("is-covered");
    overlay.replaceChildren();
    document.documentElement.classList.remove("warp-outgoing");
    document.body.removeAttribute("aria-busy");
    window.dispatchEvent(new CustomEvent("echo:warp-reset"));
  }
  function cover() {
    overlay.classList.add("is-covered");
    const white = overlay.querySelector(".tv-warp-white");
    if (white) white.style.opacity = "1";
  }
  function leavePage() {
    // pagehide에서 reset하면 다음 문서가 그려지기 전에 원래 홈이 한 프레임 노출됩니다.
    // 덮개와 홈 숨김 상태는 유지하고, 돌아왔을 때 pageshow에서만 복원합니다.
    if (active) {
      cover();
      committed = true;
    }
    finishCurrent = null;
    stopWork();
  }
  function layer(className, tag) {
    const element = document.createElement(tag || "div");
    element.className = className;
    overlay.appendChild(element);
    return element;
  }
  function place(element, rect) {
    Object.assign(element.style, {
      left: rect.left + "px", top: rect.top + "px",
      width: rect.width + "px", height: rect.height + "px"
    });
  }

  // 보이는 범위만 텍스처로 저장해 4K 원본 전체를 GPU에 복제하지 않습니다.
  function makeGpu(canvas, image, imageRect, width, height, compact, sky) {
    let gl, program, buffer, texture;
    const shaders = [];
    let lost = false;
    function dispose() {
      if (!gl) return;
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
      const extension = gl.getExtension("WEBGL_lose_context");
      if (extension && !gl.isContextLost()) extension.loseContext();
      gl = null;
    }
    try {
      gl = canvas.getContext("webgl", {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: compact ? "low-power" : "high-performance"
      });
      if (!gl) return null;
      const maxSide = Math.min(compact ? 960 : 1600, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      const ratio = Math.min(devicePixelRatio || 1, maxSide / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const source = document.createElement("canvas");
      source.width = canvas.width;
      source.height = canvas.height;
      const paint = source.getContext("2d");
      if (!paint) throw new Error("Canvas unavailable");
      paint.fillStyle = sky;
      paint.fillRect(0, 0, source.width, source.height);
      paint.drawImage(image, imageRect.left * ratio, imageRect.top * ratio,
        imageRect.width * ratio, imageRect.height * ratio);
      const samples = compact ? 8 : 14;
      function compile(type, code) {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader unavailable");
        return shader;
      }
      const vertex = compile(gl.VERTEX_SHADER,
        "attribute vec2 aPoint; varying vec2 vUV; void main(){vUV=(aPoint+1.0)*0.5; gl_Position=vec4(aPoint,0.0,1.0);}");
      const fragment = compile(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 vUV;
        uniform sampler2D uImage;
        uniform vec2 uCenter;
        uniform vec2 uShift;
        uniform float uScale;
        uniform float uPower;
        uniform float uAspect;
        void main() {
          vec2 screen = vec2(vUV.x, 1.0-vUV.y);
          vec2 uv = uCenter + (screen-uCenter-uShift)/uScale;
          vec2 direction = uv-uCenter;
          float edge = smoothstep(0.08,0.65,length((screen-uCenter-uShift)*vec2(uAspect,1.0)));
          vec4 color = vec4(0.0);
          for(int i=0; i<${samples}; i++) {
            float offset = (float(i)/${(samples - 1).toFixed(1)}-0.5)*0.32*uPower*edge;
            vec2 sampleUV = clamp(uv+direction*offset,vec2(0.001),vec2(0.999));
            color += texture2D(uImage,vec2(sampleUV.x,1.0-sampleUV.y));
          }
          gl_FragColor = vec4((color.rgb/${samples.toFixed(1)})*(1.0+uPower*0.12),1.0);
        }
      `);
      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program unavailable");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const point = gl.getAttribLocation(program, "aPoint");
      gl.enableVertexAttribArray(point);
      gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Texture unavailable");
      gl.viewport(0, 0, canvas.width, canvas.height);
      const uniforms = {};
      ["uImage", "uCenter", "uShift", "uScale", "uPower", "uAspect"].forEach(name => {
        uniforms[name] = gl.getUniformLocation(program, name);
      });
      gl.uniform1i(uniforms.uImage, 0);
      gl.uniform1f(uniforms.uAspect, width / height);
      canvas.addEventListener("webglcontextlost", () => {
        lost = true;
        canvas.style.opacity = "0";
      });
      return {
        draw(center, shift, scale, power) {
          if (lost || !gl || gl.isContextLost()) return false;
          gl.uniform2f(uniforms.uCenter, center.x / width, center.y / height);
          gl.uniform2f(uniforms.uShift, shift.x / width, shift.y / height);
          gl.uniform1f(uniforms.uScale, scale);
          gl.uniform1f(uniforms.uPower, power);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          return true;
        }, dispose
      };
    } catch (_) {
      dispose();
      canvas.style.opacity = "0";
      return null;
    }
  }

  function makeLines(canvas, width, height, compact, color) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};
    const ratio = Math.min(devicePixelRatio || 1, compact ? 1 : 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.scale(ratio, ratio);
    const rays = Array.from({ length: compact ? 26 : 52 }, (_, i) => ({
      angle: i * 2.39996, seed: (i * 0.618034) % 1, width: 0.6 + (i % 3) * 0.55
    }));
    const radius = Math.hypot(width, height);
    return (center, power, progress) => {
      ctx.clearRect(0, 0, width, height);
      if (power <= 0) return;
      ctx.strokeStyle = color;
      rays.forEach(ray => {
        const distance = (0.14 + ((ray.seed + progress * 1.6) % 1) * 0.76) * radius;
        const length = (0.03 + power * 0.27) * radius;
        const cos = Math.cos(ray.angle);
        const sin = Math.sin(ray.angle);
        ctx.globalAlpha = power * (0.18 + ray.seed * 0.55);
        ctx.lineWidth = ray.width;
        ctx.beginPath();
        ctx.moveTo(center.x + cos * distance, center.y + sin * distance);
        ctx.lineTo(center.x + cos * (distance + length), center.y + sin * (distance + length));
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };
  }

  overlay.runTransition = function (tv, destination, options) {
    if (active) return true;
    const settings = options || {};
    const url = new URL(destination, location.href);
    if (url.origin !== location.origin) return false;
    const image = document.querySelector(".archive-artwork img");
    const rect = tv.getBoundingClientRect();
    if (!image || !image.complete || !image.naturalWidth || !rect.width || !rect.height) return false;
    const imageRect = image.getBoundingClientRect();
    const width = innerWidth;
    const height = innerHeight;
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const compact = matchMedia("(pointer: coarse)").matches || width < 720;
    const reduced = settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tokens = getComputedStyle(document.documentElement);
    reset();
    active = true;
    const world = layer("tv-warp-world");
    // 실제 DOM은 유지합니다. 뒤로 돌아왔을 때 메뉴·스크롤·TV 위치가 복원됩니다.
    const backdrop = document.querySelector(".archive-backdrop");
    if (backdrop && getComputedStyle(backdrop).display !== "none") {
      const copy = document.createElement("div");
      copy.className = "tv-warp-backdrop";
      copy.style.background = getComputedStyle(backdrop).background;
      place(copy, backdrop.getBoundingClientRect());
      world.appendChild(copy);
    }
    const poster = image.cloneNode(false);
    poster.removeAttribute("srcset");
    poster.removeAttribute("sizes");
    poster.src = image.currentSrc || image.src;
    poster.alt = "";
    poster.style.maskImage = getComputedStyle(image.parentElement).maskImage;
    place(poster, imageRect);
    world.appendChild(poster);
    world.style.transformOrigin = center.x + "px " + center.y + "px";
    const gpu = layer("tv-warp-gpu", "canvas");
    const lines = layer("tv-warp-lines", "canvas");
    const spark = layer("tv-warp-spark");
    const white = layer("tv-warp-white");
    overlay.style.setProperty("--spark-x", (settings.point ? settings.point.x : center.x) + "px");
    overlay.style.setProperty("--spark-y", (settings.point ? settings.point.y : center.y) + "px");
    overlay.hidden = false;
    document.documentElement.classList.add("warp-outgoing");
    document.body.setAttribute("aria-busy", "true");
    if (!reduced) renderer = makeGpu(gpu, image, imageRect, width, height, compact,
      tokens.getPropertyValue("--home-sky").trim());
    const drawLines = reduced ? () => {} : makeLines(lines, width, height, compact,
      tokens.getPropertyValue("--warp-white").trim());
    const finalScale = Math.max(12, width / rect.width * 1.3, height / rect.height * 1.3);

    function finish() {
      if (!active || committed) return;
      committed = true;
      cancelAnimationFrame(frame);
      cover();
      // 흰색이 실제로 그려지기 전에 GPU 캔버스를 비우지 않습니다.
      // GPU 자원은 pagehide 또는 복구 시 정리합니다.
      // 도착 페이지에 경로와 시각만 한 번 전달합니다. YANG/YIN 쿼리도 유지합니다.
      try { sessionStorage.setItem(KEY, JSON.stringify({ path: url.pathname + url.search, at: Date.now() })); } catch (_) {}
      later(() => {
        try { location.assign(url.href); } catch (_) { reset(); }
      }, 40 * TIME_SCALE);
      // 통신 중단 시에도 흰 화면과 입력 잠금을 영구적으로 남기지 않습니다.
      later(() => {
        try { sessionStorage.removeItem(KEY); } catch (_) {}
        reset();
      }, 12000);
    }
    finishCurrent = finish;
    const duration = reduced ? 150 : DURATION;
    const start = performance.now();
    later(finish, duration * TIME_SCALE + 450);
    function tick(now) {
      if (!active || committed) return;
      const elapsed = (now - start) / TIME_SCALE;
      try {
        if (reduced) white.style.opacity = String(smooth(elapsed / duration));
        else {
          const progress = clamp((elapsed - 70) / 580);
          const travel = smooth(progress);
          const shift = { x: (width / 2 - center.x) * travel, y: (height / 2 - center.y) * travel };
          // 초반에는 조금 움직이고 후반에 빠르게 가속합니다. 최종 배율은 최소 12배입니다.
          const scale = 1 + (finalScale - 1) * Math.pow(progress, 3.1);
          const power = smooth((progress - 0.08) / 0.92);
          world.style.transform = `translate3d(${shift.x}px,${shift.y}px,0) scale(${scale})`;
          if (renderer) {
            try {
              gpu.style.opacity = renderer.draw(center, shift, scale, power)
                ? String(smooth((progress - 0.16) / 0.24)) : "0";
            } catch (_) {
              renderer.dispose();
              renderer = null;
              gpu.style.opacity = "0";
            }
          }
          drawLines({ x: center.x + shift.x, y: center.y + shift.y }, power, progress);
          spark.style.opacity = String(elapsed < 130 ? Math.sin(clamp(elapsed / 130) * Math.PI) * 0.95 : 0);
          spark.style.transform = `translate(-50%,-50%) scale(${0.25 + clamp(elapsed / 130) * 0.9})`;
          white.style.opacity = String(smooth((elapsed - 550) / 170));
        }
      } catch (_) { finish(); return; }
      if (elapsed >= duration) finish();
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return true;
  };
  overlay.cancelTransition = reset;
  // 전환 도중 추가 클릭이나 Enter가 목적지를 바꾸지 못하게 합니다.
  document.addEventListener("click", event => {
    if (active) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener("keydown", event => {
    if (active && ["Tab", "Enter", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener("resize", () => { if (finishCurrent) finishCurrent(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && finishCurrent) finishCurrent(); });
  window.addEventListener("pagehide", leavePage);
  // 첫 로딩 완료가 클릭보다 늦어도 진행 중인 전환을 리셋하지 않습니다.
  window.addEventListener("pageshow", event => { if (event.persisted) reset(); });
})();
