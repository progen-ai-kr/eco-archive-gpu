// ABOUT의 사진만 공개 상품의 메인 카드 사진에 연결합니다. 관리자 데이터는 읽기만 합니다.
(function () {
  "use strict";
  const slots = Array.from(document.querySelectorAll("[data-about-product-image]"));
  const catalog = window.ProductCatalog;
  if (!slots.length || !catalog) return;
  const fallback = "images/brand/echo-archive-logo.png";
  let generation = 0;

  function notify() {
    document.dispatchEvent(new Event("echo:about-images-updated"));
  }

  slots.forEach(image => {
    // 원래 사진 자리의 비율을 고정해 상품 사진의 비율이 달라도 배치는 그대로 둡니다.
    const width = Number(image.getAttribute("width")) || 659;
    const height = Number(image.getAttribute("height")) || 159;
    image.style.aspectRatio = width + " / " + height;
    image.style.objectFit = "contain";
    image.addEventListener("load", notify);
    image.addEventListener("error", () => {
      if (image.getAttribute("src") === fallback) return;
      image.src = fallback;
      image.alt = "상품 이미지를 준비 중입니다 — ECHO ARCHIVE";
      image.dataset.imageStatus = "unavailable";
    });
  });

  async function refresh() {
    const version = ++generation;
    try {
      const products = await catalog.loadVisibleProducts();
      if (version !== generation) return;
      const photos = products.map(product => ({
        id: product.id,
        name: String(product.name || "ECHO ARCHIVE 상품"),
        // 상세 이미지 대신 SHOP 카드에서 사용하는 첫 번째 이미지만 가져옵니다.
        source: catalog.safeImageUrl(Array.isArray(product.images) ? product.images[0] : "")
      })).filter(photo => photo.source);
      slots.forEach((image, index) => {
        const photo = photos.length ? photos[index % photos.length] : null;
        image.src = photo ? photo.source : fallback;
        image.alt = photo ? photo.name + " 대표 이미지" : "등록된 상품 이미지가 없습니다 — ECHO ARCHIVE";
        image.dataset.productId = photo ? photo.id : "";
        image.dataset.imageStatus = photo ? "linked" : "empty";
      });
      notify();
    } catch (_) {
      if (version !== generation) return;
      slots.forEach(image => {
        image.src = fallback;
        image.alt = "상품 이미지를 불러오지 못했습니다 — ECHO ARCHIVE";
        image.dataset.imageStatus = "unavailable";
      });
      notify();
    }
  }

  window.addEventListener("pageshow", event => { if (event.persisted) refresh(); });
  refresh();
})();
