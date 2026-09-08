// 홈 TV Wall — 채널 튜닝 인트로, 키보드/클릭 내비게이션, BGM 토글.
// echo-tv-wall.js(제품별 이미지 신호판)는 아이콘 전용 크롬 Y2K 시안에서 더 이상 쓰이지 않아 제거되었다.
(function () {
  "use strict";

  var SESSION_KEY = "echoTvWallTuned";
  var BASE_DELAY_MS = 900;
  var STAGGER_MS = 180;
  var BGM_SRC = null; // PRD §BGM: 승인된 로컬 음원이 저장소에 없으면 null로 유지 — OFF 폴백만 완성한다.

  function alreadyTuned() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (error) {
      return false; // sessionStorage를 쓸 수 없으면 매번 재생 — 안전한 폴백
    }
  }

  function markTuned() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (error) {
      // 저장 실패는 무시 — 이번 로드에서는 정상 재생된다
    }
  }

  function runTuningIntro(tvs) {
    if (!tvs.length) return;
    tvs.forEach(function (tv) {
      tv.classList.add("is-tuning");
    });
    tvs.forEach(function (tv, index) {
      window.setTimeout(function () {
        tv.classList.remove("is-tuning");
      }, BASE_DELAY_MS + index * STAGGER_MS);
    });
  }

  function initTuningIntro(tvs) {
    if (alreadyTuned()) return;
    markTuned();
    var reduced = window.EchoMotion && window.EchoMotion.prefersReducedMotion();
    if (reduced) return; // 노이즈 연출 자체를 건너뛰고 평소 idle 상태로 바로 표시
    runTuningIntro(tvs);
  }

  // ── 클릭/포커스/키보드 내비게이션 (신호 전환 연출과 연결) ──────────
  function initNavigation(tvs) {
    var transitionInFlight = false;

    tvs.forEach(function (tv) {
      var setFocused = function (focused) {
        tv.classList.toggle("is-focused", focused);
      };
      tv.addEventListener("mouseenter", function () { setFocused(true); });
      tv.addEventListener("focusin", function () { setFocused(true); });
      tv.addEventListener("mouseleave", function () { setFocused(false); });
      tv.addEventListener("focusout", function () { setFocused(false); });

      if (tv.tagName !== "A") return; // BGM 버튼은 페이지 전환 연출을 타지 않는다

      tv.addEventListener("click", function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var transition = document.querySelector("signal-transition");
        if (transitionInFlight || !transition || typeof transition.runTransition !== "function") return;

        event.preventDefault();
        transitionInFlight = true;
        document.body.setAttribute("aria-busy", "true");
        transition.runTransition(tv, tv.href, {
          reducedMotion: window.EchoMotion && window.EchoMotion.prefersReducedMotion(),
        });
      });
    });

    var wall = document.querySelector(".tv-wall");
    if (wall) {
      wall.addEventListener("keydown", function (event) {
        if (!window.EchoMotion || !window.EchoMotion.isDesktop()) return;
        var direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[event.key];
        if (!direction) return;
        var index = tvs.indexOf(document.activeElement);
        if (index < 0) return;
        var next = tvs[(index + direction + tvs.length) % tvs.length];
        next.focus();
        event.preventDefault();
      });
    }

    window.addEventListener("pageshow", function () {
      transitionInFlight = false;
      document.body.removeAttribute("aria-busy");
    });
  }

  // ── BGM 토글 (순수 상태 기계는 scripts/home-logic.js) ───────────
  function initBgm(button) {
    if (!button) return;
    var logic = window.EchoHomeLogic;
    var liveStatus = document.getElementById("bgmLiveStatus");
    var state = logic.initialBgmState();
    var audio = null;

    if (BGM_SRC) {
      audio = new Audio(BGM_SRC);
      audio.loop = true;
    }

    function render() {
      button.setAttribute("aria-pressed", state.pressed ? "true" : "false");
      button.setAttribute("aria-label", state.pressed ? "배경음악 끄기" : "배경음악 켜기");
      if (liveStatus) liveStatus.textContent = state.pressed ? "배경음악 켜짐" : "배경음악 꺼짐";
    }

    function dispatch(action) {
      state = logic.bgmReducer(state, action);
      render();
    }

    button.addEventListener("click", function () {
      var wasPending = state.pending;
      var wasPressed = state.pressed;
      dispatch(logic.BGM_ACTIONS.TOGGLE_REQUEST);
      if (wasPending) return; // 재생 대기 중 빠른 연속 클릭은 무시

      if (!wasPressed) {
        // OFF → ON 요청: 음원이 없으면 접근 가능한 OFF 상태를 유지하고 조용히 끝낸다(404 금지)
        if (!audio) {
          dispatch(logic.BGM_ACTIONS.PLAY_FAILURE);
          return;
        }
        var playResult = audio.play();
        if (playResult && typeof playResult.then === "function") {
          playResult
            .then(function () { dispatch(logic.BGM_ACTIONS.PLAY_SUCCESS); })
            .catch(function () { dispatch(logic.BGM_ACTIONS.PLAY_FAILURE); });
        } else {
          dispatch(logic.BGM_ACTIONS.PLAY_SUCCESS);
        }
      } else if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    function stop() {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      state = logic.initialBgmState();
      render();
    }
    window.addEventListener("pagehide", stop);

    render();
  }

  function init() {
    var tvs = Array.prototype.slice.call(document.querySelectorAll(".tv"));
    if (!tvs.length) return;

    initTuningIntro(tvs);
    initNavigation(tvs);
    initBgm(document.querySelector('[data-tv-role="bgm"]'));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
