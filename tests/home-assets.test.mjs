// 홈 TV 월의 "순수 CSS/SVG 렌더" 계약을 고정하는 테스트.
// 캐비닛·장식·화면은 전부 CSS 그라데이션과 인라인 SVG로 그린다 — 래스터 사진(webp/png)을
// 쓰지 않아서 누끼(알파 경계) 문제가 구조적으로 발생하지 않고, 화면 안 아이콘은 실제 DOM이라
// hover/포커스/aria-pressed 등 상태에 반응할 수 있다.
// 외부 패키지 없이 node:test + node:assert/strict + 파일 텍스트 검사만 사용한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "..");
const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const styleCss = fs.readFileSync(path.join(repoRoot, "style.css"), "utf8");

const TV_ROLES = ["portfolio", "bgm", "yang", "about", "yin"];

// 하나의 TV 요소(여는 태그부터 다음 TV 직전까지)를 잘라낸다.
// 정규식 하나로 중첩 태그를 세는 대신, TV가 형제로 나열된다는 구조를 이용한다.
function extractTvBlock(html, role) {
  const start = html.search(new RegExp('<(?:a|button)\\b[^>]*data-tv-role="' + role + '"'));
  if (start < 0) return null;
  const rest = html.slice(start + 1);
  const nextTv = rest.search(/<(?:a|button)\b[^>]*data-tv-role="/);
  const end = nextTv < 0 ? html.length : start + 1 + nextTv;
  return html.slice(start, end);
}

test("TV 캐비닛에는 래스터 셸 이미지가 없다 (CSS로만 그린다)", () => {
  assert.ok(!/tv-shell/.test(indexHtml), "tv-shell 이미지 클래스가 남아있으면 안 된다");
  for (const role of TV_ROLES) {
    const block = extractTvBlock(indexHtml, role);
    assert.ok(block, role + " TV 요소를 찾을 수 없다");
    assert.ok(!/<img\b/.test(block), role + " TV 안에는 <img> 태그가 없어야 한다");
  }
});

test("각 TV 화면 안에는 인라인 SVG 아이콘이 있다", () => {
  for (const role of TV_ROLES) {
    const block = extractTvBlock(indexHtml, role);
    const screen = (block.split("tv-screen-wrap")[1] || "").split("tv-controls")[0];
    assert.match(screen, /<svg\b/, role + " 화면 안에는 inline SVG 아이콘이 있어야 한다");
  }
});

test("BGM 화면만 상태 전환을 위한 두 개의 아이콘(on/off)을 가진다", () => {
  const bgmBlock = extractTvBlock(indexHtml, "bgm");
  assert.match(bgmBlock, /tv-icon-bgm-on/);
  assert.match(bgmBlock, /tv-icon-bgm-off/);
  for (const role of ["portfolio", "yang", "about", "yin"]) {
    const block = extractTvBlock(indexHtml, role);
    assert.ok(!/tv-icon-bgm-/.test(block), role + " 화면에는 BGM 전용 아이콘 클래스가 없어야 한다");
  }
});

test("장식(안테나·귀·날개·꼬리)은 img가 아니라 인라인 SVG다", () => {
  const decorWrappers = indexHtml.match(/<span class="tv-decor[^"]*"[^>]*>[\s\S]*?<\/span>/g) || [];
  assert.ok(decorWrappers.length > 0, "tv-decor 장식 요소가 있어야 한다");
  for (const wrapper of decorWrappers) {
    assert.ok(!/<img\b/.test(wrapper), "장식 안에는 <img> 태그가 없어야 한다: " + wrapper.slice(0, 60));
    assert.match(wrapper, /<svg\b/, "장식 안에는 인라인 SVG가 있어야 한다: " + wrapper.slice(0, 60));
  }
});

test("베젤의 노브·전원등은 실제 요소이며 CSS로만 그려진다", () => {
  assert.match(styleCss, /\.tv-led\s*\{/, "style.css에 .tv-led 규칙이 있어야 한다");
  assert.match(styleCss, /\.tv-knob\s*\{/, "style.css에 .tv-knob 규칙이 있어야 한다");
  for (const role of TV_ROLES) {
    const block = extractTvBlock(indexHtml, role);
    assert.match(block, /class="tv-led"/, role + " TV에는 tv-led 요소가 있어야 한다");
    assert.match(block, /class="tv-knobs"/, role + " TV에는 tv-knobs 요소가 있어야 한다");
  }
});

test("공용 머티리얼 defs가 있고 id가 중복되지 않는다", () => {
  // 그라데이션/필터는 한 곳에서만 정의한다. 부품마다 defs를 두면 id가 중복돼
  // CI의 validate_site.py가 거부하고, 브라우저도 첫 번째 정의만 쓴다.
  assert.match(indexHtml, /class="tv-materials"/, "공용 머티리얼 SVG가 있어야 한다");
  const ids = (indexHtml.match(/\sid="([^"]+)"/g) || []).map((raw) => raw.replace(/\sid="/, "").replace(/"$/, ""));
  const seen = new Set();
  for (const id of ids) {
    assert.ok(!seen.has(id), "중복된 id가 있으면 안 된다: " + id);
    seen.add(id);
  }
});

test("장식 SVG는 웹툰 화풍(선화 + 셀 셰이딩)으로 그려진다", () => {
  // 선화가 사라지거나 평면 단색으로 되돌아가는 회귀를 막는다.
  // 선화가 실루엣을 강제로 또렷하게 만들고, 톤이 2개 이상이어야 입체로 읽힌다.
  const decorWrappers = indexHtml.match(/<span class="tv-decor[^"]*"[^>]*>[\s\S]*?<\/svg>/g) || [];
  assert.equal(decorWrappers.length, 5, "장식은 5개(안테나·강아지귀·천사날개·꼬리·고양이귀)여야 한다");
  for (const wrapper of decorWrappers) {
    const label = (wrapper.match(/tv-decor-[a-z-]+/) || ["?"])[0];
    assert.match(wrapper, /stroke="#[0-9a-fA-F]{3,6}"/, label + ": 선화(stroke)가 있어야 한다");
    const tones = new Set((wrapper.match(/fill="#[0-9a-fA-F]{3,6}"/g) || []));
    assert.ok(tones.size >= 2, label + ": 톤이 2개 이상이어야 한다(현재 " + tones.size + "개)");
  }
});

test("index.html이 참조하는 로컬 이미지 파일이 모두 존재한다", () => {
  const sources = indexHtml.match(/(?:src|href)="([^"]+\.(?:png|webp|jpg|jpeg|svg|avif))(?:\?[^"]*)?"/g) || [];
  for (const raw of sources) {
    const value = raw.replace(/^(?:src|href)="/, "").replace(/"$/, "").split("?")[0];
    if (/^(?:https?:)?\/\//.test(value)) continue;
    const filePath = path.join(repoRoot, value.replace(/^\//, ""));
    assert.ok(fs.existsSync(filePath), "참조된 이미지가 없다: " + value);
  }
});
