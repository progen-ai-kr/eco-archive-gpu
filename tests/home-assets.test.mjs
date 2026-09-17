// 이미지 기반 홈: 승인된 원본 보존, 모바일 전용 자산, 접근 가능한 상태 표시를 검증합니다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");

// 최종 선택한 깨끗한 TV 장면이 실수로 재압축되지 않도록 파일을 고정합니다.
test("글자를 제거한 데스크톱 TV 장면이 바이트 단위로 보존된다", () => {
  const desktop = fs.readFileSync(path.join(repoRoot, "images/home/echo-desktop-clean-v2.png"));
  assert.equal(createHash("sha256").update(desktop).digest("hex"), "6e5804062893c3fba70867ce259e9f058fe9ac0d3d2df608e1005aae63fc80cc");
});

test("가로/세로 이미지의 실제 크기가 HTML 예약 비율과 일치한다", () => {
  for (const [file, width, height] of [["echo-desktop-hd-v4.png", 4344, 1448], ["echo-mobile-hd-v4.png", 2048, 3072]]) {
    const buffer = fs.readFileSync(path.join(repoRoot, "images/home", file));
    assert.equal(buffer.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(buffer.readUInt32BE(16), width);
    assert.equal(buffer.readUInt32BE(20), height);
    assert.match(indexHtml, new RegExp('(?:src|srcset)="images/home/' + file.replace('.', '\\.') + '"[^>]*width="' + width + '" height="' + height + '"'));
  }
});

test("화면을 채우는 별도 배경 이미지가 유지된다", () => {
  const backdrop = fs.readFileSync(path.join(repoRoot, "images/home/echo-backdrop-v2.png"));
  assert.equal(createHash("sha256").update(backdrop).digest("hex"), "26cbc1e29469505d466d750a620eac4f3a637b6ad901cd4a5cdaae67a8d4ac3e");
  const css = fs.readFileSync(path.join(repoRoot, "home.css"), "utf8");
  assert.match(css, /echo-backdrop-v2\.png/);
  assert.match(css, /background:[^;]*cover no-repeat/s);
});

test("음악 재생 상태는 원본 음소거 그림 위에 별도 아이콘으로 표시할 수 있다", () => {
  const block = indexHtml.match(/<button\b[^>]*data-tv-role="bgm"[\s\S]*?<\/button>/)?.[0];
  assert.ok(block);
  assert.match(block, /class="archive-sound-on" aria-hidden="true"/);
  assert.match(block, /<svg\b/);
  assert.match(indexHtml, /id="bgmLiveStatus"[^>]*role="status"[^>]*aria-live="polite"/);
});

test("모든 로컬 이미지와 모바일/데스크톱 선택 자산이 존재한다", () => {
  const sources = indexHtml.match(/(?:src|srcset|href)="([^"\s]+\.(?:png|webp|jpg|jpeg|svg|avif))(?:\?[^\"]*)?"/g) || [];
  assert.ok(sources.length >= 3);
  for (const raw of sources) {
    const value = raw.replace(/^(?:src|srcset|href)="/, "").replace(/"$/, "").split("?")[0];
    if (/^(?:https?:)?\/\//.test(value)) continue;
    assert.ok(fs.existsSync(path.join(repoRoot, value)), "참조된 이미지가 없다: " + value);
  }
});

test("ID가 중복되지 않아 메뉴와 음악 상태의 연결이 유지된다", () => {
  const ids = [...indexHtml.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(indexHtml, /aria-controls="primaryNav"/);
  assert.match(indexHtml, /id="primaryNav"/);
});
