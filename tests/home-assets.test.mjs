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

// 히어로는 화면 폭에 맞는 크기만 내려받도록 srcset으로 단계를 나눕니다.
// width/height는 원본 비율(레이아웃 예약값)을 그대로 유지해 CLS를 막습니다.
test("히어로 srcset 단계가 실제 파일 크기와 일치한다", () => {
  // JPEG의 SOF 마커에서 실제 픽셀 크기를 읽습니다.
  function jpegSize(buffer) {
    assert.equal(buffer.readUInt16BE(0), 0xffd8, "JPEG 시그니처가 아닙니다");
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      // SOF0/1/2/9 등 크기를 담은 마커(DHT·DAC·RST 제외)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
    throw new Error("JPEG 크기를 찾지 못했습니다");
  }

  const steps = [
    ["echo-desktop-v5-1920.jpg", 1920, 640],
    ["echo-desktop-v5-2896.jpg", 2896, 965],
    ["echo-mobile-v5-780.jpg", 780, 1170],
    ["echo-mobile-v5-1400.jpg", 1400, 2100],
  ];
  for (const [file, width, height] of steps) {
    const buffer = fs.readFileSync(path.join(repoRoot, "images/home", file));
    const size = jpegSize(buffer);
    assert.equal(size.width, width, file + " 폭");
    assert.equal(size.height, height, file + " 높이");
    // srcset에 해당 파일이 올바른 w 서술자와 함께 있어야 합니다.
    assert.match(indexHtml, new RegExp("images/home/" + file.replace(/\./g, "\\.") + " " + width + "w"));
    // 무거운 히어로가 다시 들어오지 않도록 상한을 둡니다.
    assert.ok(buffer.length < 400 * 1024, file + "이 400KB를 넘습니다(" + Math.round(buffer.length / 1024) + "KB)");
  }

  // 레이아웃 예약값은 원본 비율을 유지합니다.
  assert.match(indexHtml, /srcset="images\/home\/echo-desktop-v5[^"]*"[^>]*width="4344" height="1448"/);
  assert.match(indexHtml, /srcset="images\/home\/echo-mobile-v5[^"]*"[^>]*width="2048" height="3072"/);
});

test("화면을 채우는 별도 배경 이미지가 유지된다", () => {
  const css = fs.readFileSync(path.join(repoRoot, "home.css"), "utf8");
  // 모바일 전용 cover 배경. 구름·반사만 있어 JPEG으로 가볍게 유지합니다.
  assert.match(css, /background:[^;]*cover no-repeat/s, "cover 배경 선언이 있어야 한다");
  assert.match(css, /echo-backdrop-v5-900\.jpg/, "기본 배경 파일을 참조해야 한다");

  for (const [file, limitKB] of [["echo-backdrop-v5-900.jpg", 60], ["echo-backdrop-v5-1280.jpg", 90]]) {
    const buffer = fs.readFileSync(path.join(repoRoot, "images/home", file));
    assert.equal(buffer.readUInt16BE(0), 0xffd8, file + "은 JPEG이어야 한다");
    assert.ok(buffer.length < limitKB * 1024,
      file + "이 " + limitKB + "KB를 넘습니다(" + Math.round(buffer.length / 1024) + "KB)");
  }
  // image-set을 모르는 브라우저를 위한 url() 폴백이 함께 있어야 합니다.
  assert.match(css, /url\("images\/home\/echo-backdrop-v5-900\.jpg"\)[^;]*no-repeat/s);
});

test("음악 재생 상태는 원본 음소거 그림 위에 별도 아이콘으로 표시할 수 있다", () => {
  const block = indexHtml.match(/<button\b[^>]*data-tv-role="bgm"[\s\S]*?<\/button>/)?.[0];
  assert.ok(block);
  assert.match(block, /class="archive-sound-on" aria-hidden="true"/);
  assert.match(block, /<svg\b/);
  assert.match(indexHtml, /id="bgmLiveStatus"[^>]*role="status"[^>]*aria-live="polite"/);
});

test("모든 로컬 이미지와 모바일/데스크톱 선택 자산이 존재한다", () => {
  // srcset은 "경로 780w, 경로 1400w" 형태이므로 쉼표로 나누고 서술자를 떼어 냅니다.
  const values = [];
  for (const match of indexHtml.matchAll(/(?:src|srcset|href)="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) {
      const url = candidate.trim().split(/\s+/)[0].split("?")[0];
      if (url && /\.(?:png|webp|jpg|jpeg|svg|avif)$/i.test(url)) values.push(url);
    }
  }
  assert.ok(values.length >= 3, "이미지 참조가 너무 적습니다");
  for (const value of values) {
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
