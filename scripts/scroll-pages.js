// Products / Contact: 움직이지 않는 바깥 요소로 위치를 읽고 안쪽만 움직입니다.
// About과 같은 진입/유지 경계로 초점을 바꿔 경계 부근의 깜빡임을 방지합니다.
(function () {
  "use strict";
  const body = document.body;
  if (!body.matches(".products-page, .contact-page") ||
      typeof IntersectionObserver !== "function") return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let observers = [];
  let units = [];
  let resizeFrame;
  let focusFrame;
  let generation = 0;

  function prepare() {
    units = Array.from(document.querySelectorAll("main [data-scroll]"));
    units.forEach(function (unit) {
      if (unit.classList.contains("scroll-ready")) return;
      const content = document.createElement(unit.matches("div, article") ? "div" : "span");
      content.className = "scroll-content";
      while (unit.firstChild) content.append(unit.firstChild);
      unit.append(content);
      unit.classList.add("scroll-ready");
    });
  }

  function configure() {
    const version = ++generation;
    cancelAnimationFrame(focusFrame);
    observers.forEach(function (observer) { observer.disconnect(); });
    observers = [];
    prepare();
    body.classList.toggle("has-scroll-motion", !reduced.matches);
    if (reduced.matches) {
      units.forEach(function (unit) { unit.classList.add("scroll-seen", "scroll-focused"); });
      return;
    }

    const height = window.visualViewport ? Math.min(innerHeight, visualViewport.height) : innerHeight;
    const inset = innerWidth < 720 ? 0.08 : 0.14;
    const entry = { top: height * inset, bottom: height * (1 - inset) };
    const keep = { top: height * 0.04, bottom: height * 0.96 };
    const states = new Map();
    const intersects = function (rect, bounds) { return rect.bottom > bounds.top && rect.top < bounds.bottom; };
    units.forEach(function (unit) {
      const rect = unit.getBoundingClientRect();
      states.set(unit, { enter: intersects(rect, entry), keep: intersects(rect, keep) });
    });

    function flush() {
      if (version !== generation) return;
      states.forEach(function (state, unit) {
        const active = state.enter || (state.keep && unit.classList.contains("scroll-focused"));
        unit.classList.toggle("scroll-focused", active);
        if (active) unit.classList.add("scroll-seen");
      });
    }
    flush();

    function observeBand(bounds, key) {
      const observer = new IntersectionObserver(function (entries) {
        if (version !== generation) return;
        entries.forEach(function (entry) { states.get(entry.target)[key] = entry.isIntersecting; });
        cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(flush);
      }, {
        rootMargin: -bounds.top + "px 0px " + -(innerHeight - bounds.bottom) + "px 0px",
        threshold: 0
      });
      units.forEach(function (unit) { observer.observe(unit); });
      observers.push(observer);
    }
    observeBand(entry, "enter");
    observeBand(keep, "keep");
  }

  function refresh() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(configure);
  }
  // Tab으로 이동한 링크는 스크롤 초점과 무관하게 즉시 선명하게 표시합니다.
  document.addEventListener("focusin", function (event) {
    const target = event.target.closest("[data-scroll], .card");
    if (!target) return;
    [target].concat(Array.from(target.querySelectorAll("[data-scroll]"))).forEach(function (unit) {
      unit.classList.add("scroll-seen", "scroll-focused");
    });
  });
  document.addEventListener("echo:products-rendered", refresh);
  window.addEventListener("resize", refresh);
  window.addEventListener("pageshow", refresh);
  if (window.visualViewport) visualViewport.addEventListener("resize", refresh);
  reduced.addEventListener("change", refresh);
  if (document.fonts) document.fonts.ready.then(refresh);
  configure();
})();
