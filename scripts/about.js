// About 전용: 고정된 의미 단위로 초점을 판단하고 안쪽 요소만 움직입니다.
(function () {
  "use strict";
  const body = document.body;
  const motion = window.EchoMotion;
  if (!body.classList.contains("about-page") || !motion ||
      typeof window.IntersectionObserver !== "function") return;
  const scenes = Array.from(document.querySelectorAll(".about-scene[data-scene]"));
  const progress = document.querySelector(".about-progress");
  if (!scenes.length || !progress) return;
  const intro = document.querySelector(".about-intro");
  const links = Array.from(progress.querySelectorAll("a[href^='#scene-']"));
  const count = progress.querySelector(".about-progress-count");
  const episode = document.querySelector("#scene-episode");
  const stage = episode.querySelector(".about-archive-stage");
  const track = episode.querySelector(".about-archive-track");
  const viewport = episode.querySelector(".about-archive-window");
  // 가로로 잘린 카드 대신 같은 높이의 기준선을 관찰해 좌우 노출에 따른 흐림을 없앱니다.
  const archiveProxies = ["image", "caption"].map(function (kind) {
    const proxy = document.createElement("span");
    proxy.className = "about-archive-proxy";
    proxy.setAttribute("aria-hidden", "true");
    proxy.dataset.kind = kind;
    stage.append(proxy);
    return proxy;
  });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const supportsTimeline = window.CSS && CSS.supports("animation-timeline", "view()") &&
    CSS.supports("animation-range", "contain 0% contain 100%");
  let observers = [];
  let resizeFrame;
  let focusFrame;
  let generation = 0;

  // JS가 없으면 원래 문서 그대로 읽힙니다. 감지 요소에는 transform을 주지 않습니다.
  document.querySelectorAll(".about-scene-visual > img, .about-archive-card > img").forEach(function (img) {
    const anchor = document.createElement("div");
    anchor.className = "about-image-anchor";
    img.before(anchor);
    anchor.append(img);
  });
  document.querySelectorAll(".about-translation-steps li > span, .craft-steps li > span").forEach(function (number) {
    number.classList.add("about-step-number");
  });
  const units = Array.from(document.querySelectorAll(
    ".about-intro-line, .about-intro > .about-scene-meta, .about-intro-bottom > p, " +
    ".about-scene-copy > p:not(.about-cta):not(.about-scene-sublink), .about-scene-copy > h2, " +
    ".about-image-anchor, .about-scene-visual > .about-scene-meta, " +
    ".about-scene-visual figcaption, .about-archive-card figcaption, " +
    ".about-translation-steps li, .craft-steps li"
  ));
  units.forEach(function (unit) {
    unit.classList.add("about-focus-anchor");
    const move = document.createElement("span");
    move.className = "about-move";
    const focus = document.createElement("span");
    focus.className = "about-focus";
    while (unit.firstChild) focus.append(unit.firstChild);
    move.append(focus);
    unit.append(move);
    if (unit.tagName === "H2") {
      const nodes = Array.from(focus.childNodes);
      let line;
      let index = 0;
      nodes.forEach(function (node) {
        if (!line) {
          line = document.createElement("span");
          line.className = "about-title-line";
          line.style.setProperty("--line", index++);
          focus.append(line);
        }
        if (node.nodeName === "BR") { node.remove(); line = null; }
        else line.append(node);
      });
    }
  });

  function updateProgress(scene) {
    count.textContent = scene.dataset.scene + " / " + String(scenes.length).padStart(2, "0");
    scenes.forEach(function (item) { item.classList.toggle("is-current", item === scene); });
    links.forEach(function (link) {
      if (link.hash === "#" + scene.id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function configureArchive(enabled) {
    episode.classList.remove("has-archive-scroll");
    episode.style.removeProperty("--archive-travel");
    episode.style.removeProperty("--archive-distance");
    if (!enabled || !supportsTimeline || window.innerWidth < 900 || window.innerHeight < 720) return;
    episode.classList.add("has-archive-scroll");
    const distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    // 확대나 짧은 화면에서 전체 내용이 들어가지 않으면 세로로 복귀합니다.
    const stageTop = parseFloat(getComputedStyle(stage).top) || 0;
    if (stage.scrollHeight > window.innerHeight - stageTop - 32 || distance < 1) {
      episode.classList.remove("has-archive-scroll");
      return;
    }
    episode.style.setProperty("--archive-distance", -distance + "px");
    episode.style.setProperty("--archive-travel", Math.min(distance / .85, window.innerHeight * 2.5) + "px");
    const stageRect = stage.getBoundingClientRect();
    archiveProxies.forEach(function (proxy) {
      const sample = track.querySelector(proxy.dataset.kind === "image" ? ".about-image-anchor" : "figcaption");
      const rect = sample.getBoundingClientRect();
      proxy.style.top = rect.top - stageRect.top + "px";
      proxy.style.height = rect.height + "px";
    });
  }

  function configure() {
    const version = ++generation;
    observers.forEach(function (observer) { observer.disconnect(); });
    observers = [];
    cancelAnimationFrame(focusFrame);
    const enabled = !motion.prefersReducedMotion();
    body.classList.toggle("has-about-motion", enabled);
    body.classList.toggle("has-scene-progress", enabled);
    body.classList.toggle("has-about-timeline", enabled && supportsTimeline);
    configureArchive(enabled);
    if (!enabled) {
      body.classList.remove("is-reading");
      units.forEach(function (unit) { unit.classList.add("is-focused", "is-seen"); });
      return;
    }
    const mobile = window.innerWidth < 900;
    const height = window.visualViewport ? Math.min(innerHeight, window.visualViewport.height) : innerHeight;
    const top = mobile ? Math.ceil(progress.getBoundingClientRect().height) : 16;
    const bottom = 16;
    const usable = Math.max(1, height - top - bottom);
    const band = function (inset) { return { top: top + usable * inset, bottom: height - bottom - usable * inset }; };
    const entryBand = band(mobile ? .1 : .15);
    const keepBand = band(mobile ? .05 : .1);
    const states = new Map();
    const observedUnits = new Map();
    const intersects = function (rect, bounds) { return rect.bottom > bounds.top && rect.top < bounds.bottom; };
    units.forEach(function (unit) {
      const rect = unit.getBoundingClientRect();
      const enter = intersects(rect, entryBand);
      const keep = intersects(rect, keepBand);
      states.set(unit, { enter: enter, keep: keep });
      const proxy = episode.classList.contains("has-archive-scroll") && unit.closest(".about-archive-card")
        ? archiveProxies[unit.classList.contains("about-image-anchor") ? 0 : 1] : unit;
      if (!observedUnits.has(proxy)) observedUnits.set(proxy, []);
      observedUnits.get(proxy).push(unit);
      unit.classList.toggle("is-focused", enter || (keep && unit.classList.contains("is-focused")));
      if (enter) unit.classList.add("is-seen");
    });
    // 두 Observer 결과를 모아 갱신하므로 콜백 순서가 바뀌어도 깜빡이지 않습니다.
    function flush() {
      if (version !== generation) return;
      states.forEach(function (state, unit) {
        unit.classList.toggle("is-focused", state.enter || (state.keep && unit.classList.contains("is-focused")));
        if (state.enter) unit.classList.add("is-seen");
      });
    }
    function observeBand(bounds, key) {
      const observer = new IntersectionObserver(function (entries) {
        if (version !== generation) return;
        entries.forEach(function (entry) {
          observedUnits.get(entry.target).forEach(function (unit) { states.get(unit)[key] = entry.isIntersecting; });
        });
        cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(flush);
      }, {
        // %는 너비 기준이므로 높이로 계산한 px 사용. 가로 사진 띠는 좌우 위치로 흐리지 않습니다.
        rootMargin: -bounds.top + "px 10000px " + -(innerHeight - bounds.bottom) + "px 10000px",
        threshold: 0
      });
      observedUnits.forEach(function (_, target) { observer.observe(target); });
      observers.push(observer);
    }
    observeBand(entryBand, "enter");
    observeBand(keepBand, "keep");
    const centralScenes = new Map();
    const progressObserver = new IntersectionObserver(function (entries) {
      if (version !== generation) return;
      entries.forEach(function (entry) {
        if (entry.target === intro) body.classList.toggle("is-reading", entry.boundingClientRect.bottom <= height * .35);
        else if (entry.isIntersecting) centralScenes.set(entry.target, entry);
        else centralScenes.delete(entry.target);
      });
      const closest = Array.from(centralScenes.values()).sort(function (a, b) {
        const distance = function (entry) { return Math.abs((entry.intersectionRect.top + entry.intersectionRect.bottom) / 2 - height / 2); };
        return distance(a) - distance(b);
      })[0];
      if (closest) updateProgress(closest.target);
    }, { rootMargin: -height * .35 + "px 0px " + -height * .35 + "px 0px", threshold: 0 });
    scenes.forEach(function (scene) { progressObserver.observe(scene); });
    if (intro) progressObserver.observe(intro);
    observers.push(progressObserver);
  }
  function scheduleConfigure() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = motion.raf(configure);
  }
  function revealDestination() {
    const target = scenes.find(function (scene) { return "#" + scene.id === location.hash; });
    if (!target) return;
    target.classList.add("is-direct-entry");
    target.querySelectorAll(".about-focus-anchor").forEach(function (unit) { unit.classList.add("is-seen"); });
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }
  window.addEventListener("hashchange", revealDestination);
  document.addEventListener("focusin", function (event) {
    const unit = event.target.closest(".about-focus-anchor");
    if (unit) unit.classList.add("is-seen", "is-focused");
  });
  window.addEventListener("resize", scheduleConfigure);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", scheduleConfigure);
  reducedMotion.addEventListener("change", configure);
  document.querySelectorAll(".about-page main img").forEach(function (img) {
    if (!img.complete) img.addEventListener("load", scheduleConfigure, { once: true });
  });
  if (document.fonts) document.fonts.ready.then(scheduleConfigure);
  if (typeof ResizeObserver === "function") {
    const sizeObserver = new ResizeObserver(scheduleConfigure);
    sizeObserver.observe(episode.querySelector(".about-scene-copy"));
    sizeObserver.observe(progress);
  }
  configure();
  revealDestination();
})();
