(function () {
  "use strict";

  let transitionInFlight = false;

  function updatePosition(label, tvs, active) {
    if (!label) return;
    const index = Math.max(0, tvs.indexOf(active));
    label.textContent = index + 1 + " / " + tvs.length;
  }

  function resolveProducts(tvs) {
    if (!window.ProductCatalog) return;

    window.ProductCatalog.loadVisibleProducts()
      .then((products) => {
        const featured = products.filter((product) => product && product.featured);
        const orderedProducts = featured.length ? featured : products;

        tvs.forEach((tv, index) => {
          const signalName = tv.dataset.productName || "";
          const exactMatch = products.find(
            (product) => String(product.name || "").trim().toLowerCase() === signalName.trim().toLowerCase()
          );
          const slot = Number(tv.dataset.slot || index);
          const product = exactMatch || orderedProducts[slot];

          if (!product) {
            tv.classList.add("is-unresolved");
            tv.setAttribute("aria-label", signalName + " — 제품 등록 대기 중, 제품 목록 보기");
            return;
          }

          tv.href = "product.html?id=" + encodeURIComponent(product.id);
          tv.classList.remove("is-unresolved");
          tv.setAttribute("aria-label", signalName + " — " + (product.name || "제품 상세") + " 보기");

          const image = window.ProductCatalog.safeImageUrl(product.images && product.images[0]);
          const screenImage = tv.querySelector(".tv-screen img");
          if (image && screenImage) {
            screenImage.src = image;
            screenImage.alt = (product.name || signalName) + " 대표 이미지";
            screenImage.addEventListener("error", () => {
              screenImage.parentElement.classList.add("img-failed");
            }, { once: true });
          }
        });
      })
      .catch(() => {
        tvs.forEach((tv) => tv.classList.add("is-unresolved"));
        console.warn("[echo-tv-wall] 제품 카탈로그를 불러오지 못했습니다.");
      });
  }

  function initTvWall(root) {
    const wall = root.querySelector(".tv-wall");
    const tvs = Array.from(root.querySelectorAll(".tv"));
    const positionLabel = root.querySelector(".tv-wall-position");
    if (!wall || !tvs.length) return;

    resolveProducts(tvs);

    tvs.forEach((tv) => {
      const setFocused = (focused) => {
        tv.classList.toggle("is-focused", focused);
        if (focused) updatePosition(positionLabel, tvs, tv);
      };

      tv.addEventListener("mouseenter", () => setFocused(true));
      tv.addEventListener("focusin", () => setFocused(true));
      tv.addEventListener("mouseleave", () => setFocused(false));
      tv.addEventListener("focusout", () => setFocused(false));

      tv.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const transition = document.querySelector("signal-transition");
        if (transitionInFlight || !transition || typeof transition.runTransition !== "function") return;

        event.preventDefault();
        transitionInFlight = true;
        document.body.setAttribute("aria-busy", "true");
        transition.runTransition(tv, tv.href, {
          productName: tv.dataset.productName,
          reducedMotion: window.EchoMotion && window.EchoMotion.prefersReducedMotion(),
        });
      });
    });

    wall.addEventListener("keydown", (event) => {
      if (!window.EchoMotion || !window.EchoMotion.isDesktop()) return;
      const direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[event.key];
      if (!direction) return;
      const index = tvs.indexOf(document.activeElement);
      if (index < 0) return;
      tvs[(index + direction + tvs.length) % tvs.length].focus();
      event.preventDefault();
    });

    window.addEventListener("pageshow", () => {
      transitionInFlight = false;
      document.body.removeAttribute("aria-busy");
    });
  }

  document.querySelectorAll("echo-tv-wall").forEach(initTvWall);
})();
