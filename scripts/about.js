// About 전용 장면 활성화와 진행 표시. 공용 메뉴 스크립트와 분리합니다.
(function () {
  "use strict";

  const body = document.body;
  const motion = window.EchoMotion;
  if (!body.classList.contains("about-page") || !motion ||
      typeof window.IntersectionObserver !== "function") return;

  const scenes = Array.from(document.querySelectorAll(".about-scene[data-scene]"));
  const progress = document.querySelector(".about-progress");
  if (!scenes.length || !progress) return;

  const count = progress.querySelector(".about-progress-count");
  const intro = document.querySelector(".about-intro");
  const links = Array.from(progress.querySelectorAll("a[href^='#scene-']"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let focusObserver;
  let progressObserver;
  let resizeFrame;

  function updateProgress(scene) {
    count.textContent = scene.dataset.scene + " / " + String(scenes.length).padStart(2, "0");
    links.forEach(function (link) {
      if (link.getAttribute("href") === "#" + scene.id) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function configureScenes() {
    if (focusObserver) focusObserver.disconnect();
    if (progressObserver) progressObserver.disconnect();
    body.classList.remove("js-scenes", "has-scene-motion", "has-scene-progress", "is-reading");
    scenes.forEach(function (scene) { scene.classList.remove("is-active"); });

    // 기존 헬퍼를 재사용하며, 동작 줄이기 설정에서는 효과와 추적을 시작하지 않습니다.
    if (motion.prefersReducedMotion()) return;

    // rootMargin의 %는 너비 기준이므로 높이의 35%를 px로 계산해 중앙 30%를 확보합니다.
    const inset = Math.round(window.innerHeight * 0.35);
    const options = { rootMargin: "-" + inset + "px 0px -" + inset + "px 0px", threshold: 0 };
    const supportsTimeline = window.CSS && CSS.supports("animation-timeline", "view()");

    if (!supportsTimeline) {
      focusObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-active", entry.isIntersecting);
        });
      }, options);
      scenes.forEach(function (scene) { focusObserver.observe(scene); });
      body.classList.add("js-scenes");
    } else {
      // JS와 Observer가 사용 가능할 때만 CSS 애니메이션을 활성화합니다.
      body.classList.add("has-scene-motion");
    }

    const centralScenes = new Map();
    progressObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === intro) {
          // 인트로를 읽는 동안 모바일 진행 바가 기존 메뉴를 덮지 않게 합니다.
          body.classList.toggle("is-reading", entry.boundingClientRect.bottom <= inset);
          return;
        }
        if (entry.isIntersecting) centralScenes.set(entry.target, entry);
        else centralScenes.delete(entry.target);
      });
      // Observer가 전달한 위치만 사용하고 스크롤마다 화면 배치를 다시 측정하지 않습니다.
      const closest = Array.from(centralScenes.values()).sort(function (a, b) {
        const center = window.innerHeight / 2;
        const distance = function (entry) {
          return Math.abs((entry.intersectionRect.top + entry.intersectionRect.bottom) / 2 - center);
        };
        return distance(a) - distance(b);
      })[0];
      if (closest) updateProgress(closest.target);
    }, options);
    scenes.forEach(function (scene) { progressObserver.observe(scene); });
    if (intro) progressObserver.observe(intro);
    body.classList.add("has-scene-progress");
  }

  configureScenes();
  // 화면 회전·크기 변경 때만 중앙 영역을 다시 설정합니다. scroll 리스너는 필요 없습니다.
  window.addEventListener("resize", function () {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = motion.raf(configureScenes);
  });
  reducedMotion.addEventListener("change", configureScenes);
})();
