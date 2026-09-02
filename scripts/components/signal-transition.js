(function () {
  "use strict";

  const overlay = document.querySelector("signal-transition");
  if (!overlay) return;

  overlay.hidden = true;
  overlay.classList.add("signal-transition");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<div class="signal-transition-clone" aria-hidden="true"></div>' +
    '<div class="signal-transition-flash" aria-hidden="true"></div>';

  const clone = overlay.querySelector(".signal-transition-clone");
  const flash = overlay.querySelector(".signal-transition-flash");
  let pending = null;

  function reset() {
    if (pending) window.clearTimeout(pending);
    pending = null;
    overlay.hidden = true;
    clone.innerHTML = "";
    clone.removeAttribute("style");
    flash.classList.remove("is-flashing");
    document.body.classList.remove("transition-active");
    document.body.removeAttribute("aria-busy");
  }

  overlay.runTransition = function (tv, destination, options) {
    const settings = options || {};
    const finish = () => window.location.assign(destination);

    if (settings.reducedMotion) {
      overlay.hidden = false;
      pending = window.setTimeout(finish, 80);
      return;
    }

    const screen = tv.querySelector(".tv-screen") || tv;
    const rect = screen.getBoundingClientRect();
    clone.innerHTML = screen.innerHTML;
    clone.style.top = rect.top + "px";
    clone.style.left = rect.left + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.transform = "none";

    overlay.hidden = false;
    document.body.classList.add("transition-active");

    requestAnimationFrame(() => {
      const scale = Math.max(innerWidth / rect.width, innerHeight / rect.height) * 1.08;
      const translateX = (innerWidth - rect.width * scale) / 2 - rect.left;
      const translateY = (innerHeight - rect.height * scale) / 2 - rect.top;
      clone.style.transform = "translate(" + translateX + "px," + translateY + "px) scale(" + scale + ")";
    });

    let completed = false;
    const afterZoom = () => {
      if (completed) return;
      completed = true;
      pending = window.setTimeout(() => {
        flash.classList.add("is-flashing");
        pending = window.setTimeout(finish, 120);
      }, 150);
    };

    clone.addEventListener("transitionend", afterZoom, { once: true });
    pending = window.setTimeout(afterZoom, 900);
  };

  window.addEventListener("pagehide", reset);
  window.addEventListener("pageshow", reset);
})();
