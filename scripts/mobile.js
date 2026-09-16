// 모바일 전용 편의 기능. 상품/포트폴리오의 운영 데이터와 로딩 코드는 유지합니다.
(function () {
  "use strict";
  const mobile = matchMedia("(max-width: 899px)");
  const portfolio = document.querySelector("#portfolioContent");
  let viewer;
  let opener;
  let purchaseBar;
  let purchaseObserver;
  let purchaseSize;
  let imageHistory = false;
  let closingHistory = false;
  let queuedImage;

  function closeImage(updateHistory = true) {
    if (viewer && viewer.open) viewer.close();
    // dialog의 close 이벤트를 기다리지 않고 스크롤과 초점을 즉시 복원합니다.
    document.body.classList.remove("image-viewer-open");
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    if (updateHistory && imageHistory) {
      imageHistory = false;
      closingHistory = true;
      history.back();
    }
  }

  function createViewer() {
    if (viewer) return viewer;
    viewer = document.createElement("dialog");
    viewer.className = "image-viewer";
    viewer.setAttribute("aria-label", "포트폴리오 이미지 확대 보기");
    viewer.innerHTML = '<header class="image-viewer-toolbar"><p>이미지 보기</p>' +
      '<button type="button" class="image-viewer-zoom" aria-pressed="false">원본 크기</button>' +
      '<button type="button" class="image-viewer-close" autofocus>닫기</button></header>' +
      '<div class="image-viewer-canvas" tabindex="0" role="region" aria-label="확대 이미지, 스크롤하여 보기"><img alt="" /></div>' +
      '<p class="image-viewer-status" role="status" hidden></p>';
    document.body.append(viewer);
    const canvas = viewer.querySelector(".image-viewer-canvas");
    const zoom = viewer.querySelector(".image-viewer-zoom");
    zoom.addEventListener("click", function () {
      const original = canvas.classList.toggle("is-original");
      zoom.textContent = original ? "화면에 맞추기" : "원본 크기";
      zoom.setAttribute("aria-pressed", String(original));
      canvas.scrollTo(0, 0);
    });
    viewer.querySelector(".image-viewer-close").addEventListener("click", function () { closeImage(); });
    viewer.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeImage();
    });
    viewer.addEventListener("close", function () {
      if (!viewer.open) document.body.classList.remove("image-viewer-open");
    });
    const picture = viewer.querySelector("img");
    const status = viewer.querySelector(".image-viewer-status");
    picture.addEventListener("error", function () {
      status.textContent = "이미지를 불러오지 못했습니다. 닫은 뒤 다시 시도해 주세요.";
      status.hidden = false;
    });
    picture.addEventListener("load", function () {
      canvas.style.setProperty("--image-natural-width", Math.max(picture.naturalWidth, canvas.clientWidth) + "px");
    });
    return viewer;
  }

  function openImage(button, image, restoreHistory = false) {
    if (!mobile.matches) return;
    if (closingHistory) {
      queuedImage = { button, image };
      return;
    }
    const dialog = createViewer();
    opener = button;
    const picture = dialog.querySelector("img");
    const canvas = dialog.querySelector(".image-viewer-canvas");
    const zoom = dialog.querySelector(".image-viewer-zoom");
    canvas.classList.remove("is-original");
    canvas.style.setProperty("--image-natural-width", Math.max(image.naturalWidth, innerWidth) + "px");
    zoom.textContent = "원본 크기";
    zoom.setAttribute("aria-pressed", "false");
    dialog.querySelector(".image-viewer-status").hidden = true;
    picture.alt = image.alt || "포트폴리오 이미지";
    picture.src = image.currentSrc || image.src;
    document.body.classList.add("image-viewer-open");
    if (!restoreHistory) {
      const index = Array.from(portfolio.querySelectorAll(".portfolio-zoom-open")).indexOf(button);
      history.pushState({ ...history.state, echoPortfolioImage: index }, "");
    }
    imageHistory = true;
    dialog.showModal();
    canvas.scrollTo(0, 0);
  }

  function preparePortfolio() {
    if (!portfolio || typeof HTMLDialogElement === "undefined" ||
        typeof HTMLDialogElement.prototype.showModal !== "function") return;
    if (!mobile.matches) {
      if (viewer && viewer.open) closeImage();
      portfolio.querySelectorAll(".portfolio-zoom-open").forEach(function (button) {
        button.replaceWith(...button.childNodes);
      });
      return;
    }
    portfolio.querySelectorAll("img").forEach(function (image) {
      // 이미 다른 목적의 링크인 이미지는 그 링크의 동작을 보존합니다.
      if (image.closest("a, button")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "portfolio-zoom-open";
      button.setAttribute("aria-label", (image.alt || "포트폴리오 이미지") + " 확대 보기");
      image.before(button);
      button.append(image);
      button.addEventListener("click", function () { openImage(button, image); });
    });
  }

  function setupPurchase() {
    if (purchaseObserver) purchaseObserver.disconnect();
    if (purchaseSize) purchaseSize.disconnect();
    if (purchaseBar) purchaseBar.remove();
    document.body.classList.remove("has-mobile-purchase");
    const original = document.querySelector(".product-info .product-buy");
    if (!original || !mobile.matches || typeof IntersectionObserver !== "function") return;
    purchaseBar = document.createElement("div");
    purchaseBar.className = "mobile-purchase-bar";
    purchaseBar.setAttribute("role", "region");
    purchaseBar.setAttribute("aria-label", "제품 구매 바로가기");
    purchaseBar.hidden = true;
    const price = document.querySelector(".product-info .product-price");
    if (price) purchaseBar.append(price.cloneNode(true));
    const action = original.cloneNode(true);
    action.removeAttribute("data-purchase-dialog");
    if (action.tagName === "BUTTON") action.addEventListener("click", function () { original.click(); });
    purchaseBar.append(action);
    document.body.append(purchaseBar);
    const updateSize = function () {
      document.body.style.setProperty("--mobile-purchase-height", purchaseBar.offsetHeight + "px");
    };
    purchaseObserver = new IntersectionObserver(function (entries) {
      const visible = !entries[0].isIntersecting && mobile.matches;
      purchaseBar.hidden = !visible;
      document.body.classList.toggle("has-mobile-purchase", visible);
      updateSize();
    });
    purchaseObserver.observe(original);
    if (typeof ResizeObserver === "function") {
      purchaseSize = new ResizeObserver(updateSize);
      purchaseSize.observe(purchaseBar);
    }
  }

  if (portfolio) {
    new MutationObserver(preparePortfolio).observe(portfolio, { childList: true, subtree: true });
    preparePortfolio();
    // 모바일 뒤로 가기는 확대 화면만 닫고 아카이브의 읽던 위치를 유지합니다.
    window.addEventListener("popstate", function (event) {
      closingHistory = false;
      imageHistory = false;
      const index = event.state && event.state.echoPortfolioImage;
      const button = Number.isInteger(index) && portfolio.querySelectorAll(".portfolio-zoom-open")[index];
      if (button && mobile.matches) openImage(button, button.querySelector("img"), true);
      else if (viewer && viewer.open) closeImage(false);
      if (queuedImage) {
        const next = queuedImage;
        queuedImage = null;
        openImage(next.button, next.image);
      }
    });
  }
  document.addEventListener("echo:product-rendered", setupPurchase);
  mobile.addEventListener("change", function () { preparePortfolio(); setupPurchase(); });
  setupPurchase();
})();
