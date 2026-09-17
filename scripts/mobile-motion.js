// 공개 페이지 공통 모바일 등장 효과. 기존 고정 바깥 상자를 관찰하고 안쪽만 움직입니다.
(function () {
  "use strict";
  if (typeof IntersectionObserver !== "function") return;
  const mobile = matchMedia("(max-width: 899px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const body = document.body;
  const main = document.querySelector("main");
  if (!main) return;
  const records = new Map();
  let entryObserver;
  let exitObserver;
  let edgeObserver;
  let queued = 0;
  let mounted = false;

  function register(anchor, targets, kind, direction) {
    if (records.has(anchor) || !targets.length) return;
    anchor.dataset.mobileAnchor = "";
    targets.forEach(target => {
      target.dataset.mobileMotion = kind;
      target.dataset.mobileDirection = direction || (records.size % 2 ? "right" : "left");
    });
    records.set(anchor, targets);
  }

  function discover() {
    // ABOUT / SHOP / CONTACT / ARCHIVE는 이미 있는 효과 상자를 재사용합니다.
    main.querySelectorAll(".about-focus-anchor").forEach(anchor => {
      const moving = anchor.querySelector(":scope > .about-move");
      if (moving) register(anchor, [moving], anchor.classList.contains("about-image-anchor") ? "image" : "text");
    });
    main.querySelectorAll("[data-scroll]").forEach(anchor => {
      const moving = anchor.querySelector(":scope > .scroll-content");
      if (moving && !anchor.parentElement.closest("[data-mobile-anchor]")) {
        register(anchor, [moving], anchor.matches(".card-img") ? "image" : "text", anchor.dataset.scrollSide);
      }
    });
    main.querySelectorAll(".record-anchor").forEach(anchor => {
      // ARCHIVE 마지막 문구는 줄별 시차를 가진 전용 효과가 담당합니다.
      if (anchor.hasAttribute("data-outro-entry")) return;
      const moving = anchor.querySelector(":scope > .record-motion");
      if (moving) register(anchor, [moving], anchor.dataset.recordKind === "visual" ? "image" : "text", anchor.dataset.recordSide);
    });

    // 상품 상세의 본문 효과는 모든 화면에서 product-motion.js가 담당합니다.

    if (body.classList.contains("art-home")) {
      const scene = main.querySelector(".archive-scene");
      if (scene) {
        // 사진과 투명 링크를 함께 이동합니다. 별도의 고정 음향 버튼은 건드리지 않습니다.
        const layers = Array.from(scene.querySelectorAll(":scope > .archive-artwork, :scope > .archive-hotspots"));
        register(scene, layers, "image", "left");
      }
      const header = main.querySelector(".archive-header");
      const brand = main.querySelector(".archive-brand");
      if (header && brand) register(header, [brand], "text", "right");
    }
    const footer = document.querySelector(".footer, .archive-footer");
    if (footer) register(footer, Array.from(footer.children), "text", "right");
  }

  function configure() {
    queued = 0;
    if (entryObserver) entryObserver.disconnect();
    if (exitObserver) exitObserver.disconnect();
    if (edgeObserver) edgeObserver.disconnect();
    const enabled = mobile.matches && !reduced.matches;
    body.classList.toggle("has-mobile-enter", enabled);
    if (!enabled) return;
    discover();
    records.forEach((_, anchor) => { if (!anchor.isConnected) records.delete(anchor); });
    const height = window.visualViewport ? Math.min(innerHeight, visualViewport.height) : innerHeight;
    const entering = Math.round(height * .09);
    const reveal = entries => {
      if (document.documentElement.classList.contains("warp-arriving")) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("mobile-entered");
      });
    };
    entryObserver = new IntersectionObserver(reveal, { rootMargin: "0px 0px -" + entering + "px 0px", threshold: 0 });
    // 한 화면에 들어오는 홈의 푸터도 바로 읽혀야 합니다. 더 스크롤할 수 없는 끝부분은 여백 없이 감지합니다.
    edgeObserver = new IntersectionObserver(reveal, { threshold: 0 });
    // 화면 밖으로 완전히 나갔을 때만 초기화해 역방향 스크롤에서도 한 번씩 등장합니다.
    exitObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && !entry.target.contains(document.activeElement)) entry.target.classList.remove("mobile-entered");
      });
    }, { rootMargin: "64px 0px 64px 0px", threshold: 0 });
    records.forEach((_, anchor) => {
      anchor.getBoundingClientRect();
      (anchor.matches("footer") ? edgeObserver : entryObserver).observe(anchor);
      exitObserver.observe(anchor);
    });
  }

  function schedule() { if (!queued && mounted) queued = requestAnimationFrame(configure); }
  const changes = new MutationObserver(schedule);
  const arrival = new MutationObserver(schedule);
  function mount() {
    if (mounted) return;
    mounted = true;
    changes.observe(main, { childList: true, subtree: true });
    arrival.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    configure();
  }
  mobile.addEventListener("change", schedule);
  reduced.addEventListener("change", schedule);
  window.addEventListener("resize", schedule);
  document.addEventListener("echo:product-rendered", schedule);
  document.addEventListener("echo:products-rendered", schedule);
  document.addEventListener("focusin", event => {
    const anchor = event.target.closest("[data-mobile-anchor]");
    if (anchor) anchor.classList.add("mobile-entered");
  });
  window.addEventListener("pagehide", () => {
    mounted = false;
    changes.disconnect();
    arrival.disconnect();
    if (entryObserver) entryObserver.disconnect();
    if (exitObserver) exitObserver.disconnect();
    if (edgeObserver) edgeObserver.disconnect();
    cancelAnimationFrame(queued);
    queued = 0;
  });
  window.addEventListener("pageshow", event => { if (event.persisted) mount(); });
  mount();
})();
