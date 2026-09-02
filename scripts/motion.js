// 홈 TV Wall 전환 효과가 공통으로 쓰는 작은 유틸리티 모음.
// 번들러가 없으므로 window.EchoMotion 네임스페이스로 노출합니다.
window.EchoMotion = (function () {
  "use strict";

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isDesktop() {
    return window.matchMedia("(min-width: 720px)").matches;
  }

  function raf(fn) {
    return window.requestAnimationFrame(fn);
  }

  // echo:tv-focus / echo:tv-select / echo:transition-complete 공통 발행 지점.
  // 개인정보는 담지 않는다 (제품명·극성·이동 경로만).
  function dispatchEcho(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  return { prefersReducedMotion, isDesktop, raf, dispatchEcho };
})();
