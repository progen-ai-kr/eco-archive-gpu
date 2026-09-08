// 홈 TV Wall의 순수 로직(상태 전이·URL 매핑)만 모아둔 모듈.
// 브라우저에서는 <script src>로 그대로 로드되고, Node 테스트에서는 CommonJS로 require된다.
// DOM이나 브라우저 API를 참조하지 않는다 — 여기 있는 모든 함수는 입력→출력만으로 검증 가능해야 한다.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.EchoHomeLogic = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // ── BGM 토글 상태 기계 ──────────────────────────────────────────
  // 상태는 { pressed, pending } 두 값뿐이다.
  // pressed: aria-pressed에 반영될 논리 상태. pending: 재생 Promise가 아직 끝나지 않음.
  var BGM_ACTIONS = {
    TOGGLE_REQUEST: "TOGGLE_REQUEST",
    PLAY_SUCCESS: "PLAY_SUCCESS",
    PLAY_FAILURE: "PLAY_FAILURE",
  };

  function initialBgmState() {
    return { pressed: false, pending: false };
  }

  function bgmReducer(state, action) {
    var current = state || initialBgmState();
    switch (action) {
      case BGM_ACTIONS.TOGGLE_REQUEST:
        // 재생 중 재요청(빠른 연속 클릭)은 새 전이를 만들지 않는다.
        if (current.pending) return current;
        if (current.pressed) {
          // 켜져 있으면 즉시 끈다 — 정지에는 실패가 없다.
          return { pressed: false, pending: false };
        }
        return { pressed: true, pending: true };
      case BGM_ACTIONS.PLAY_SUCCESS:
        if (!current.pending) return current;
        return { pressed: true, pending: false };
      case BGM_ACTIONS.PLAY_FAILURE:
        if (!current.pending) return current;
        // 재생 Promise 거절 → 안전한 OFF로 되돌린다.
        return { pressed: false, pending: false };
      default:
        return current;
    }
  }

  // ── YIN/YANG 쿼리 매핑 ──────────────────────────────────────────
  // 대소문자를 가리지 않고 YIN/YANG만 인정한다. 그 외 값은 null(전체 목록 폴백).
  function resolvePolarityQuery(rawValue) {
    if (typeof rawValue !== "string") return null;
    var normalized = rawValue.trim().toUpperCase();
    if (normalized === "YIN" || normalized === "YANG") return normalized;
    return null;
  }

  // ── 캡슐 프레젠테이션 매핑으로 제품 극성 판정 ──────────────────────
  // products: ProductCatalog가 반환한 실제 제품 배열, capsuleEntries: EchoCapsuleData.
  // 정확한 이름이 일치하면 그 극성을 쓰고, 못 찾으면 null(알 수 없음 → 숨기지 않음).
  function resolveProductPolarity(product, capsuleEntries) {
    if (!product || !Array.isArray(capsuleEntries)) return null;
    var name = String(product.name || "").trim().toLowerCase();
    var match = capsuleEntries.find(function (entry) {
      return String(entry.productName || "").trim().toLowerCase() === name;
    });
    return match ? match.polarity : null;
  }

  function filterProductsByPolarity(products, polarity, capsuleEntries) {
    var list = Array.isArray(products) ? products : [];
    if (!polarity) return list;
    var matched = list.filter(function (product) {
      return resolveProductPolarity(product, capsuleEntries) === polarity;
    });
    // 매핑되지 않은 제품이 많아 결과가 비면 숨기지 않고 전체 목록으로 폴백한다.
    return matched.length ? matched : list;
  }

  return {
    BGM_ACTIONS: BGM_ACTIONS,
    initialBgmState: initialBgmState,
    bgmReducer: bgmReducer,
    resolvePolarityQuery: resolvePolarityQuery,
    resolveProductPolarity: resolveProductPolarity,
    filterProductsByPolarity: filterProductsByPolarity,
  };
});
