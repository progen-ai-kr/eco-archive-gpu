// ARCHIVE 표현만 보강합니다. portfolio.js의 로딩·보안 처리와 관리자 데이터는 유지합니다.
(function () {
  "use strict";
  const root = document.getElementById("portfolioContent");
  if (!root) return;
  const body = document.body;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mediaSeen = new WeakSet();
  let units = [];
  let sequence = 0;
  let prepareFrame = 0;
  let entryObserver;
  let pendingHash = true;
  let mounted = false;
  const pad = number => String(number).padStart(2, "0");

  // 관찰하는 바깥 상자는 고정하고 안쪽만 이동합니다. 애니메이션 때문에
  // 관찰 기준이 흔들리거나 긴 이미지 중간에서 초점이 깜빡이지 않습니다.
  function wrap(node, kind) {
    if (node.closest("[data-record-unit]")) return;
    const inline = /^(IMG|A|BUTTON|PICTURE|VIDEO|IFRAME)$/.test(node.tagName);
    const anchor = document.createElement(inline ? "span" : "div");
    const move = document.createElement(inline ? "span" : "div");
    anchor.className = "record-anchor";
    anchor.dataset.recordUnit = "";
    anchor.dataset.recordKind = kind;
    do { anchor.id = "archive-record-" + (++sequence); } while (document.getElementById(anchor.id));
    move.className = "record-motion";
    node.before(anchor);
    anchor.append(move);
    move.append(node);
  }

  function prepareStatic() {
    document.querySelectorAll("[data-record-reveal]").forEach(element => {
      if (element.classList.contains("record-anchor")) return;
      element.classList.add("record-anchor");
      const move = document.createElement("span");
      move.className = "record-motion";
      while (element.firstChild) move.append(element.firstChild);
      element.append(move);
    });
  }

  function prepare() {
    prepareFrame = 0;
    // 갤러리와 figure를 한 묶음으로 다뤄 열 수·설명·링크를 보존합니다.
    root.querySelectorAll("[data-brand-gallery], figure").forEach(node => wrap(node, "visual"));
    root.querySelectorAll("img").forEach((image, index) => {
      const alt = String(image.alt || "").trim();
      if (!alt || /\.(?:jpe?g|png|webp|gif)$/i.test(alt)) image.alt = "ECHO ARCHIVE 아카이브 이미지 " + (index + 1);
      image.decoding = "async";
      if (!mediaSeen.has(image)) {
        mediaSeen.add(image);
        const recordSize = () => {
          // 사진이 로드되면 비율을 기록해 이후 레이아웃 재계산을 안정시킵니다.
          if (image.naturalWidth && !image.hasAttribute("width") && !image.hasAttribute("height")) {
            image.width = image.naturalWidth;
            image.height = image.naturalHeight;
          }
          schedulePrepare();
        };
        image.addEventListener("load", recordSize);
        image.addEventListener("error", schedulePrepare);
        // 캐시에서 이미 로드된 사진도 같은 비율을 사용합니다.
        if (image.complete) recordSize();
      }
      const zoom = image.closest(".portfolio-zoom-open");
      if (zoom) zoom.setAttribute("aria-label", image.alt + " 확대 보기");
      // 모바일 확대 버튼/이미지 링크도 함께 이동시켜 동작과 클릭 위치를 보존합니다.
      const container = image.closest("a, button, picture") || image;
      wrap(container, "visual");
    });
    root.querySelectorAll("video, iframe, table").forEach(node => wrap(node, "interactive"));
    root.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, pre").forEach(node => {
      if (node.classList.contains("portfolio-status") || !node.textContent.trim() ||
          node.querySelector("img, video, iframe, table, [data-record-unit]")) return;
      wrap(node, /^H[1-6]$/.test(node.tagName) ? "title" : "text");
    });

    units = Array.from(document.querySelectorAll(".record-anchor"));
    Array.from(root.querySelectorAll("[data-record-unit]"))
      .filter(unit => ["visual", "title", "interactive"].includes(unit.dataset.recordKind))
      .forEach((unit, index) => {
        unit.dataset.recordNumber = pad(index + 1);
        unit.dataset.recordSide = index % 2 ? "right" : "left";
      });
    configureMotion();
    if (pendingHash) revealHash();
  }

  function configureMotion() {
    if (entryObserver) entryObserver.disconnect();
    const enabled = !reduced.matches && typeof IntersectionObserver === "function";
    body.classList.toggle("has-record-motion", enabled);
    // 화면 안에 있는 요소는 처음부터 읽을 수 있게 표시합니다.
    units.forEach(unit => {
      const rect = unit.getBoundingClientRect();
      if (!enabled || (rect.top < innerHeight * .94 && rect.bottom > 0)) unit.classList.add("is-seen");
    });
    if (!enabled) return;
    entryObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-seen");
        entryObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });
    units.forEach(unit => { if (!unit.classList.contains("is-seen")) entryObserver.observe(unit); });
  }

  function schedulePrepare() {
    if (!prepareFrame) prepareFrame = requestAnimationFrame(prepare);
  }
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    if (!id) { pendingHash = false; return; }
    const target = document.getElementById(id);
    if (!target) return;
    pendingHash = false;
    target.classList.add("is-seen");
    target.querySelectorAll(".record-anchor").forEach(unit => unit.classList.add("is-seen"));
    target.scrollIntoView({ behavior: "instant", block: "start" });
  }

  const mutations = new MutationObserver(schedulePrepare);
  function mount() {
    if (mounted) return;
    mounted = true;
    mutations.observe(root, { childList: true, subtree: true });
    prepare();
  }
  window.addEventListener("resize", schedulePrepare);
  reduced.addEventListener("change", schedulePrepare);
  document.addEventListener("focusin", event => {
    const anchor = event.target.closest(".record-anchor");
    if (anchor) anchor.classList.add("is-seen");
  });
  // 기본 해시 이동과 방문 기록을 유지하면서 링크 대상의 등장 대기만 해제합니다.
  document.addEventListener("click", event => {
    const link = event.target.closest(".record-start");
    if (!link) return;
    const target = document.getElementById(link.hash.slice(1));
    if (target) target.classList.add("is-seen");
    if (reduced.matches && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      history.pushState(null, "", link.hash);
      revealHash();
    }
  });
  window.addEventListener("hashchange", () => { pendingHash = true; revealHash(); });
  window.addEventListener("pagehide", () => {
    mounted = false;
    mutations.disconnect();
    if (entryObserver) entryObserver.disconnect();
    cancelAnimationFrame(prepareFrame);
    prepareFrame = 0;
  });
  window.addEventListener("pageshow", event => { if (event.persisted) mount(); });
  if (document.fonts) document.fonts.ready.then(schedulePrepare);
  prepareStatic();
  mount();
})();
