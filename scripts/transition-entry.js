// head에서 실행: 다음 페이지가 먼저 보였다가 흰색으로 덮이는 현상을 방지합니다.
(function () {
  "use strict";
  const KEY = "echo-tv-warp-arrival-v1";
  const root = document.documentElement;
  let record;
  try {
    record = JSON.parse(sessionStorage.getItem(KEY) || "null");
    sessionStorage.removeItem(KEY); // 한 번만 소비: 새로고침·직접 방문에 재생하지 않습니다.
  } catch (_) { return; }
  const nav = performance.getEntriesByType("navigation")[0];
  if (!record || record.path !== location.pathname + location.search ||
      Date.now() - record.at > 30000 || Date.now() < record.at ||
      (nav && nav.type !== "navigate")) return;

  root.classList.add("warp-arriving");
  let revealed = false;
  let observer;
  let revealTimer;
  let frame;
  let cancelled = false;
  function cleanup() {
    cancelled = true;
    cancelAnimationFrame(frame);
    clearTimeout(revealTimer);
    if (observer) observer.disconnect();
    root.classList.remove("warp-arriving", "warp-revealing");
  }
  function reveal() {
    if (revealed || cancelled) return;
    revealed = true;
    if (observer) observer.disconnect();
    clearTimeout(revealTimer);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        root.classList.add("warp-revealing");
        // 560ms 페이드가 끝난 뒤 제거합니다. 중간에 덮개가 사라지지 않게 여유를 둡니다.
        revealTimer = setTimeout(cleanup, 640);
      });
    });
  }
  // DOM 이후 공개 데이터가 도착하면 표시하되, 느린 통신을 무한히 기다리지 않습니다.
  function ready() {
    if (cancelled || revealed) return;
    const content = document.querySelector("#portfolioContent, #product-list");
    const loading = () => content && (content.getAttribute("aria-busy") === "true" || /불러오는|로딩/.test(content.textContent));
    if (loading()) {
      observer = new MutationObserver(() => {
        if (!loading()) reveal();
      });
      observer.observe(content, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-busy"] });
      clearTimeout(revealTimer);
      revealTimer = setTimeout(reveal, 900);
    } else reveal();
  }
  revealTimer = setTimeout(reveal, 1800);
  document.addEventListener("DOMContentLoaded", ready, { once: true });
  window.addEventListener("pagehide", cleanup);
  window.addEventListener("pageshow", event => { if (event.persisted) cleanup(); });
})();
