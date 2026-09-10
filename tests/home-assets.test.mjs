// 홈 TV 월의 "렌더 자산 레이어링" 계약을 고정하는 테스트.
// 재질(캐비닛·장식·바닥)은 투명 배경 이미지가 담당하고,
// 클릭 대상·화면 아이콘·글자는 계속 실제 HTML 요소여야 한다.
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

test("각 TV에는 캐비닛 셸 이미지가 하나씩 있다", () => {
  for (const role of TV_ROLES) {
    const block = extractTvBlock(indexHtml, role);
    assert.ok(block, role + " TV 요소를 찾을 수 없다");
    const shells = block.match(/class="(?:[^"]*\s)?tv-shell(?:\s[^"]*)?"/g) || [];
    assert.equal(shells.length, 1, role + " TV에는 셸 이미지가 정확히 1개여야 한다");
  }
});

test("셸 이미지는 접근성 트리에서 제외된다", () => {
  const shellTags = indexHtml.match(/<img[^>]*class="(?:[^"]*\s)?tv-shell(?:\s[^"]*)?"[^>]*>/g) || [];
  assert.ok(shellTags.length > 0, "셸 이미지 태그가 있어야 한다");
  for (const tag of shellTags) {
    assert.match(tag, /alt=""/, "셸 이미지는 빈 alt를 가져야 한다: " + tag);
    assert.match(tag, /aria-hidden="true"/, "셸 이미지는 aria-hidden=true여야 한다: " + tag);
  }
});

test("셸 이미지는 포인터 입력을 가로채지 않는다", () => {
  assert.match(
    styleCss,
    /\.tv-shell\s*\{[^}]*pointer-events:\s*none/s,
    "style.css에 .tv-shell pointer-events:none 규칙이 있어야 한다"
  );
});

test("index.html이 참조하는 로컬 이미지 파일이 모두 존재한다", () => {
  const sources = indexHtml.match(/(?:src|href)="([^"]+\.(?:png|webp|jpg|jpeg|svg|avif))(?:\?[^"]*)?"/g) || [];
  assert.ok(sources.length > 0, "이미지 참조가 있어야 한다");
  for (const raw of sources) {
    const value = raw.replace(/^(?:src|href)="/, "").replace(/"$/, "").split("?")[0];
    if (/^(?:https?:)?\/\//.test(value)) continue;
    const filePath = path.join(repoRoot, value.replace(/^\//, ""));
    assert.ok(fs.existsSync(filePath), "참조된 이미지가 없다: " + value);
  }
});

test("화면 안에 img 태그를 넣지 않는다 (아이콘은 셸 사진 또는 inline SVG)", () => {
  const screens = indexHtml.match(/<span class="tv-screen">[\s\S]*?<\/span>\s*<\/span>/g) || [];
  assert.equal(screens.length, TV_ROLES.length, "화면 블록은 TV 수와 같아야 한다");
  for (const screen of screens) {
    assert.ok(!/<img\b/.test(screen), "화면 안에 이미지를 넣으면 안 된다");
  }
});

test("BGM 화면만 상태 전환을 위해 inline SVG 아이콘을 유지한다", () => {
  // 1·3·4·5번은 셸 사진에 구워진 아이콘을 그대로 쓰고, 2번(BGM)만 ON/OFF 상태를
  // 전환해야 해서 동적인 inline SVG 두 장을 계속 사용한다.
  const bgmBlock = extractTvBlock(indexHtml, "bgm");
  assert.match(bgmBlock, /<svg\b/, "BGM 화면에는 inline SVG 아이콘이 있어야 한다");
  for (const role of ["portfolio", "yang", "about", "yin"]) {
    const block = extractTvBlock(indexHtml, role);
    assert.ok(!/<svg\b/.test(block.split("tv-screen-wrap")[1] || ""), role + " 화면 안에는 inline SVG가 없어야 한다 (셸 사진의 아이콘을 사용)");
  }
});
