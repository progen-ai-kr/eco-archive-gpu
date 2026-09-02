(function () {
  "use strict";

  const overlay = document.querySelector("signal-transition");
  if (!overlay) return;

  overlay.hidden = true;
  overlay.classList.add("signal-transition");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<div class="signal-transition-clone" aria-hidden="true"></div>' +
    '<div class="signal-transition-tunnel" aria-hidden="true"></div>' +
    '<div class="signal-transition-flash" aria-hidden="true"></div>';

  const clone = overlay.querySelector(".signal-transition-clone");
  const tunnel = overlay.querySelector(".signal-transition-tunnel");
  const flash = overlay.querySelector(".signal-transition-flash");
  let pending = [];

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    pending.push(timer);
    return timer;
  }

  function reset() {
    pending.forEach((timer) => window.clearTimeout(timer));
    pending = [];
    overlay.hidden = true;
    clone.innerHTML = "";
    clone.removeAttribute("style");
    clone.classList.remove("is-rushing");
    tunnel.classList.remove("is-visible");
    flash.classList.remove("is-flashing");
    overlay.classList.remove("is-active");
    document.body.classList.remove("transition-active");
    document.body.removeAttribute("aria-busy");
  }

  overlay.runTransition = function (tv, destination, options) {
    const settings = options || {};
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      window.location.assign(destination);
    };

    if (settings.reducedMotion) {
      overlay.hidden = false;
      overlay.classList.add("is-active");
      flash.classList.add("is-flashing");
      schedule(finish, 90);
      return;
    }

    const rect = tv.getBoundingClientRect();
    const tvCopy = tv.cloneNode(true);
    tvCopy.classList.remove("is-focused");
    tvCopy.removeAttribute("href");
    tvCopy.setAttribute("aria-hidden", "true");
    tvCopy.setAttribute("tabindex", "-1");
    clone.innerHTML = "";
    clone.appendChild(tvCopy);
    clone.style.top = rect.top + "px";
    clone.style.left = rect.left + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.transform = "translate3d(0,0,0) scale(1)";

    overlay.hidden = false;
    overlay.classList.add("is-active");
    document.body.classList.add("transition-active");

    requestAnimationFrame(() => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const liftX = (innerWidth / 2 - centerX) * .26;
      const liftY = (innerHeight / 2 - centerY) * .26 - 8;
      clone.style.transition = "transform .36s cubic-bezier(.2,.85,.28,1), filter .36s ease";
      clone.style.transform = "translate3d(" + liftX + "px," + liftY + "px,0) scale(1.12)";

      schedule(() => {
        const scale = Math.max(innerWidth / rect.width, innerHeight / rect.height) * 1.42;
        const translateX = innerWidth / 2 - centerX;
        const translateY = innerHeight / 2 - centerY;
        clone.classList.add("is-rushing");
        tunnel.classList.add("is-visible");
        clone.style.transition = "transform .62s cubic-bezier(.18,.8,.2,1), filter .28s ease";
        clone.style.transform = "translate3d(" + translateX + "px," + translateY + "px,0) scale(" + scale + ")";
      }, 420);
    });

    schedule(() => {
      flash.classList.add("is-flashing");
      schedule(finish, 115);
    }, 1120);
  };

  window.addEventListener("pagehide", reset);
  window.addEventListener("pageshow", reset);
})();
