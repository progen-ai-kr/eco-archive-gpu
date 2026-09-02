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

// 여기에 다른 동작을 추가할 수 있습니다.
// 예: Codex에게 "스크롤하면 메뉴 배경을 진하게 해줘" 처럼 말하면 코드가 채워집니다.
