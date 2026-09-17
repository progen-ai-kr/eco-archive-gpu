// 관리자 상품이 렌더링된 뒤에만 등장 효과를 연결합니다. 데이터와 본문 구조는 바꾸지 않습니다.
(function () {
  "use strict";
  if (!document.body.classList.contains("product-page") || typeof IntersectionObserver !== "function") return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let entryObserver;
  let exitObserver;
  let sequence = 0;

  function mark(node, side, delay) {
    if (!node || node.hasAttribute("data-product-reveal")) return;
    if (!node.textContent.trim() && !node.matches("img, video, iframe, .product-hero-gallery") && !node.querySelector("img, video, iframe")) return;
    node.dataset.productReveal = "";
    node.dataset.productSide = side || (sequence++ % 2 ? "right" : "left");
    if (delay) node.style.setProperty("--product-delay", delay + "ms");
  }

  function prepare() {
    // 원본 크기를 모르는 지연 로딩 사진은 가로 이동 전에도 화면 감지 면적을 확보합니다.
    document.querySelectorAll(".product-rich-text img").forEach(image => {
      if (image.complete && image.naturalWidth) image.classList.add("product-image-ready");
      else image.addEventListener("load", () => image.classList.add("product-image-ready"), { once: true });
    });
    mark(document.querySelector(".product-hero-gallery"), "left");
    document.querySelectorAll(".product-info > *").forEach((node, i) => mark(node, "right", Math.min(i * 45, 180)));
    document.querySelectorAll(".product-rich-text > *").forEach(node => {
      // 사진 여러 장을 한 문단에 붙여 넣은 경우에도 각 사진이 읽는 위치에서 등장합니다.
      // 표·목록·분할 갤러리와 사진+글 혼합 문단은 한 묶음으로 유지합니다.
      const media = node.querySelectorAll("img, video, iframe");
      if (node.tagName === "P" && !node.textContent.trim() && media.length) {
        media.forEach(image => mark(image.closest("a") || image));
      } else mark(node);
    });
    document.querySelectorAll(".product-full-image, .product-highlight, .product-image-text > *, .product-gallery > *, .related-episodes-title, .related-card, .product-back .btn")
      .forEach(node => mark(node));
    configure();
  }

  function configure() {
    if (entryObserver) entryObserver.disconnect();
    if (exitObserver) exitObserver.disconnect();
    document.body.classList.toggle("has-product-motion", !reduced.matches);
    if (reduced.matches) return;
    entryObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("product-entered"); });
    }, { rootMargin: "0px 0px -32px 0px", threshold: 0 });
    // 가로 이동만 사용하므로 세로 감지 위치는 고정됩니다. 완전히 벗어난 뒤에만 다시 준비합니다.
    exitObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && !entry.target.contains(document.activeElement)) entry.target.classList.remove("product-entered");
      });
    }, { rootMargin: "80px 0px 80px 0px", threshold: 0 });
    document.querySelectorAll("main [data-product-reveal], .product-back [data-product-reveal]").forEach(node => {
      entryObserver.observe(node);
      exitObserver.observe(node);
    });
  }
  document.addEventListener("echo:product-rendered", prepare);
  reduced.addEventListener("change", configure);
  document.addEventListener("focusin", event => {
    const node = event.target.closest("[data-product-reveal]");
    if (node) node.classList.add("product-entered");
  });
  window.addEventListener("pagehide", () => {
    if (entryObserver) entryObserver.disconnect();
    if (exitObserver) exitObserver.disconnect();
  });
  window.addEventListener("pageshow", event => { if (event.persisted) configure(); });
  prepare();
})();
