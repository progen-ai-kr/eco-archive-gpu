// 모바일 메뉴(햄버거 ☰) 열고 닫기
const toggle = document.querySelector(".nav-toggle");
const menu = document.querySelector(".nav-menu");

function setMenuOpen(open) {
  menu.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
}

if (toggle && menu) {
  toggle.addEventListener("click", () => setMenuOpen(!menu.classList.contains("open")));
  // 메뉴 항목을 누르면 자동으로 닫히게
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });
  // 메뉴 안팎 어디에서든 Esc로 닫고 토글 버튼으로 포커스를 되돌림
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("open")) {
      setMenuOpen(false);
      toggle.focus();
    }
  });
}

// 음양 룰(.yy-rule) — 화면에 들어오면 경계 노드가 좌→우로 미끄러진다.
// prefers-reduced-motion에서는 style.css의 전역 규칙이 transition을 0에 가깝게 줄여
// 사실상 즉시 나타나므로 여기서 별도 분기하지 않아도 된다.
const yyRules = document.querySelectorAll(".yy-rule");
if (yyRules.length && "IntersectionObserver" in window) {
  const yyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          yyObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  yyRules.forEach((rule) => yyObserver.observe(rule));
}

// 여기에 다른 동작을 추가할 수 있습니다.
// 예: Codex에게 "스크롤하면 메뉴 배경을 진하게 해줘" 처럼 말하면 코드가 채워집니다.
