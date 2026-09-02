// CAPSULE 01 — 陰/陽 홈 전시용 프레젠테이션 데이터.
// ★ 이 파일은 products.json을 대체하지 않습니다. 실제 제품 정보(가격/구매링크/상세내용)는
//   여전히 /admin에서 관리하는 products.json이 정본이며, 이 파일은 홈 TV Wall에 보여줄
//   4개 시즌 신호(제품명·극성·이미지)만 담습니다. echo-tv-wall.js가 런타임에
//   ProductCatalog.loadVisibleProducts()로 실제 제품을 찾아 상세 링크를 연결합니다.
window.EchoCapsuleData = [
  {
    code: "SIGNAL-001",
    productName: "CAT_404",
    polarity: "YIN",
    image: "images/capsule/cat-404.png",
    fallbackHref: "products.html",
    // 외주 영상이 도착하면 아래 자리에 채웁니다 (현재는 미사용, 요청하지 않음).
    // videoWebm: "", videoMp4: "", poster: "",
  },
  {
    code: "SIGNAL-002",
    productName: "DOG_404",
    polarity: "YANG",
    image: "images/capsule/dog-404.png",
    fallbackHref: "products.html",
  },
  {
    code: "SIGNAL-003",
    productName: "DEVIL_666",
    polarity: "YIN",
    image: "images/capsule/devil-666.png",
    fallbackHref: "products.html",
  },
  {
    code: "SIGNAL-004",
    productName: "ANGEL_777",
    polarity: "YANG",
    image: "images/capsule/angel-777.png",
    fallbackHref: "products.html",
  },
];
