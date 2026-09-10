// 홈 TV Wall — 채널 튜닝 인트로, 키보드/클릭 내비게이션, BGM 토글.
// echo-tv-wall.js(제품별 이미지 신호판)는 아이콘 전용 크롬 Y2K 시안에서 더 이상 쓰이지 않아 제거되었다.
(function () {
  "use strict";

  var SESSION_KEY = "echoTvWallTuned";
  var BASE_DELAY_MS = 900;
  var STAGGER_MS = 180;
  var BGM_SRC = "audio/velvet-shoreline.mp3";
  // 원본은 30초지만 마지막 약 5초가 무음이라, 소리가 끝나는 지점에서 처음으로 돌아간다.
  var BGM_LOOP_END_SECONDS = 25;

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
    var audio = document.getElementById("bgmAudio");
    var loopGuardId = null;

    if (audio || BGM_SRC) {
      audio = audio || new Audio(BGM_SRC);
      audio.preload = "auto";
      audio.loop = true;

      // 기본 loop 속성만 쓰면 30초 전체를 반복하므로 마지막 무음까지 재생한다.
      // 25초를 감지해 먼저 되감으면 사용자가 끌 때까지 소리가 이어진다.
      audio.addEventListener("timeupdate", rewindBeforeSilence);
    } else {
      // 승인된 음원이 아직 없다 — 눌렀다가 조용히 OFF로 튕기면 "고장"처럼 보인다(QA 지적).
      // 처음부터 "준비 중" 상태로 정직하게 표시하고, 클릭해도 상태 기계는 건드리지 않는다.
      button.classList.add("is-bgm-unavailable");
      button.setAttribute("aria-label", "배경음악 준비 중");
      if (button.title !== undefined) button.title = "배경음악 준비 중";
    }

    function rewindBeforeSilence() {
      if (audio) {
        if (!audio.paused && logic.shouldRestartBgm(audio.currentTime, BGM_LOOP_END_SECONDS)) {
          audio.currentTime = 0;
        }
      }
    }

    function startLoopGuard() {
      if (loopGuardId !== null) return;
      // 일부 백그라운드 탭은 timeupdate를 드물게 보내므로 짧은 주기 감시를 함께 둔다.
      loopGuardId = window.setInterval(rewindBeforeSilence, 100);
    }

    function stopLoopGuard() {
      if (loopGuardId === null) return;
      window.clearInterval(loopGuardId);
      loopGuardId = null;
    }

    function render() {
      button.setAttribute("aria-pressed", state.pressed ? "true" : "false");
      if (audio) {
        var actionLabel = state.pressed ? "배경음악 끄기" : "배경음악 켜기";
        button.setAttribute("aria-label", actionLabel);
        button.title = "SOUND — " + actionLabel;
      }
      if (liveStatus) liveStatus.textContent = state.pressed ? "배경음악 켜짐" : "배경음악 꺼짐";
    }

    function dispatch(action) {
      state = logic.bgmReducer(state, action);
      render();
    }

    button.addEventListener("click", function () {
      if (!audio) {
        // 상태 전이를 만들지 않는다 — aria-pressed가 true→false로 튀면 "눌렀는데 꺼졌다"로
        // 읽힌다. 대신 짧은 흔들림으로 "지금은 반응하지 않는다"는 걸 시각적으로만 알린다.
        button.classList.remove("is-bgm-shake");
        void button.offsetWidth; // 같은 클래스를 다시 붙여도 애니메이션이 재생되도록 리플로우 강제
        button.classList.add("is-bgm-shake");
        return;
      }
      var wasPending = state.pending;
      var wasPressed = state.pressed;
      dispatch(logic.BGM_ACTIONS.TOGGLE_REQUEST);
      if (wasPending) return; // 재생 대기 중 빠른 연속 클릭은 무시

      if (!wasPressed) {
        var playResult = audio.play();
        if (playResult && typeof playResult.then === "function") {
          playResult
            .then(function () {
              dispatch(logic.BGM_ACTIONS.PLAY_SUCCESS);
              startLoopGuard();
            })
            .catch(function () {
              stopLoopGuard();
              dispatch(logic.BGM_ACTIONS.PLAY_FAILURE);
            });
        } else {
          dispatch(logic.BGM_ACTIONS.PLAY_SUCCESS);
          startLoopGuard();
        }
      } else if (audio) {
        stopLoopGuard();
        audio.pause();
        audio.currentTime = 0;
      }
    });

    function stop() {
      stopLoopGuard();
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
