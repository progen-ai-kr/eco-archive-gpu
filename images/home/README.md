# 홈 이미지 원본과 편집 기록

## 현재 적용: 모바일 메뉴 분리 및 고해상도 v4

- `echo-mobile-hd-v4.png`: 2048 × 3072px. 위 오른쪽 ABOUT TV 본체 높이를 옆 TV에 맞추고 합성 경계와 금속 디테일을 보정했습니다.
- `echo-desktop-hd-v4.png`: 4344 × 1448px. 기존 3:1 파노라마의 배치를 유지하면서 크롬·화면·구름·바닥 디테일을 보정했습니다.
- 방식: 내장 imagegen 편집 → 생성 결과(모바일 1024 × 1536, 데스크톱 2172 × 724)를 고품질 bicubic 보간으로 가로·세로 2배 확대 → PNG 저장. 요청한 큰 해상도를 생성 도구가 직접 출력한 것은 아니며, 픽셀 수 증가 자체가 실제 디테일 4배 복원을 의미하지 않습니다.
- 기존 이미지들은 보존했습니다. 생성 편집이므로 세부 반사와 구름이 원본과 픽셀 단위로 동일하지는 않습니다.
- 모바일 헤더와 메뉴는 문서 흐름을 사용하고, 이미지와 클릭 영역은 `archive-scene`에 함께 넣었습니다. 메뉴가 펼쳐지면 장면을 아래로 밀며, 짧은 화면에서는 세로 스크롤로 모두 접근합니다. 데스크톱 헤더·메뉴는 기존 위치를 유지합니다.
- 사용자 요청에 따라 브라우저 조작과 테스트는 실행하지 않았습니다.

### v4 최종 생성 프롬프트

모바일:

```text
Use case: precise-object-edit. Edit target: attached portrait image of FOUR chrome CRT TVs in 2x2 arrangement. Produce a high-resolution restored upscale, EXACT output 2048x3072 pixels, retain 2:3 aspect ratio and original framing. Correct ONLY the upper-right ABOUT TV (glowing horizontal dash in parentheses) to have the SAME chrome cabinet width AND height as upper-left yin-yang TV and lower two TVs: enlarge it slightly vertically, align top and bottom of its cabinet with upper-left cabinet. Keep body boxes roughly x19%-50% and x51%-82%, upper row y27%-44%, bottom row y48%-66%. Preserve all four symbols, the asymmetrical angel/bat wing antenna above upper-left, dog ears and feather wing bottom-left, cat ears and devil tail bottom-right. NO sound/speaker TV. Preserve chrome polished silver gloss, original camera, pale blue cloud colors and reflective floor, original centered composition and blank space. Clean up the visible rectangular collage seams and blurry patches around upper-right TV and floor, seamlessly match reflections. Restore fine chrome edges, individual feathers, cat ears, glass highlights, prevent pixelation, ringing or oversharpening. Do not add objects, text, labels, logo, border or UI. This is detail restoration plus matching cabinet dimensions, NOT a redesign. Output actual 2048x3072 high-res raster.
```

데스크톱:

```text
Use case: precise-object-edit. Edit target: attached ultrawide 3:1 panorama of FIVE chrome CRT TVs centered in blue cloudy studio. Upscale and restore this exact image to actual 3840x1280 pixels, maintain EXACT 3:1 aspect ratio. Preserve the entire composition, subject sizes and normalized positions, all five TV bodies, exact screen icons and wing/ear/tail details, camera, silver chrome materials and single seamless cloud background and reflective floor. Do not rearrange, move, enlarge or shrink subjects. Restore sharp fine edges of chrome casings, subtle metal reflections and tiny buttons, individual feathers, screen glyph edges, smooth clean natural clouds and glossy floor. Remove blur/pixelation while preserving intentional soft lighting. No text, logo, watermark, added objects, seams, new textures, sharpening halos, fake grain or color change. Output actual 3840x1280 high-resolution raster, not a smaller preview.
```

## 현재 데스크톱: 단일 파노라마 v3

- 파일: `echo-desktop-panorama-v3.png` (2172 × 724px, 3:1).
- `echo-desktop-clean-v2.png`를 참조해 내장 imagegen 편집 모드로 좌우 구름과 반사 바닥을 확장했습니다. 생성 편집이므로 원본과 픽셀 단위로 동일한 파일은 아닙니다.
- 데스크톱에서는 별도 `archive-backdrop`을 숨기고, 이 한 장으로 화면을 채웁니다. 로고와 메뉴는 화면 안쪽에 고정하고 TV 클릭 영역은 새 파노라마 좌표를 사용합니다.
- 모바일 이미지는 기존 파일을 사용합니다. 브라우저 조작과 테스트는 사용자 요청에 따라 실행하지 않았습니다.
- 최종 생성 프롬프트:

```text
Use case: compositing. Edit target: attached clean five-TV artwork. Outpaint ONLY the pale icy-blue cloudy studio and reflective floor horizontally into a single seamless ultrawide 3:1 panorama, ideally 3072x1024. Place the existing original 1537x1023 image unchanged at the exact center, at its existing scale, with about 768 pixels of new background on both sides. Do NOT zoom, redraw, rearrange, resize or alter any of the five TVs, screen symbols, chrome material, angel/bat antenna, dog ears, feather wing, cat ears, devil tail, or their reflections. Keep original vertical framing unchanged. All subject content should remain in central 50% of the panorama; only expand blank studio around it. Continue the original cloud patterns and blue brightness seamlessly across the old boundaries, and extend the same floor perspective, reflection bands and lighting. There must be no vertical seams, panels, tone steps, borders, fake extended blur, mirror duplicates, extra TVs, logos, lettering or watermarks. Output one continuous edge-to-edge scene used as a responsive website background. No text anywhere.
```

- `echo-desktop.png`: 사용자가 최종 선택해 첨부한 이미지를 수정·재압축 없이 복사. 1538 × 1023px.
- 데스크톱 SHA-256: `659abfa5a92edf4f8fa8009cb2a5748322ba589bed966a5423fef5ef3084ab19`.
- `echo-mobile.png`: 모바일 전용 세로 구도. 1024 × 1536px. **TV 4개를 2×2로 배치**하며, 음악(음소거) TV는 포함하지 않습니다.
- `bgm-button.png`: 모바일 음악 버튼용 원형 이미지. 256 × 256px, 배경 투명.
- `echo-desktop-clean-v2.png`: 모든 글자와 바깥 여백을 제거한 데스크톱 TV 장면. 1537 × 1023px.
- `echo-backdrop-v2.png`: TV나 글자 없이 구름과 반사 바닥만 있는 전체 화면 배경. 1672 × 941px.
- 모바일 배열: 위 PORTFOLIO·ABOUT, 아래 YANG·YIN (2×2). 음악은 화면 오른쪽 아래 고정 원형 버튼으로 분리.
- 데스크톱 배열: 기존 그대로(위 PORTFOLIO·음악, 아래 YANG·ABOUT·YIN). 음악 버튼은 720px 이상에서 그림 속 음소거 TV 위의 클릭 영역으로 되돌아갑니다.
- `index.html`의 picture가 720px부터 데스크톱 파일을 선택합니다. 데스크톱은 파노라마 한 장을 비율대로 확대하고 화면 밖의 배경을 잘라 채웁니다.
- 클릭 좌표는 `home.css`의 `--tv-x`, `--tv-y`, `--tv-w`, `--tv-h`에 정의되어 있습니다. 이미지를 교체하면 모바일·데스크톱 좌표를 각각 확인하세요.
- 데스크톱 v2에는 글자가 포함되지 않습니다. 로고·메뉴·푸터·TV 라벨은 `index.html`과 `home.css`가 별도 컴포넌트로 표시합니다.

## 데스크톱 v2 이미지 생성 프롬프트

- TV 장면: 원본의 다섯 TV, 금속 질감, 화면 아이콘, 날개·귀·꼬리, 바닥 반사를 유지하고 모든 로고·메뉴·푸터 문구와 바깥 여백을 제거한 가장자리까지 이어지는 가로형 3D 장면.
- 전체 배경: 원본의 옅은 얼음색 구름과 반사 바닥만 남기고 TV·장식·글자를 모두 제거한 저대비 빈 스튜디오. `background-size: cover`로 사용할 수 있도록 가장자리를 단순하게 유지.
- 생성 방식: 기본 내장 imagegen 도구의 기존 이미지 편집 모드.

## 모바일 2×2 이미지 제작 방법 (현재 버전)

생성형 이미지 도구가 아니라 **기존 에셋 합성**으로 만들었습니다. 크롬 질감·조명이 원본과 100% 동일하게 유지됩니다.

기준 원본: 이전 5개 TV 버전의 `echo-mobile.png` (2-2-1 배치).

1. **음악 버튼 크롭** — 우상단 음소거 TV의 화면을 원형으로 잘라 `bgm-button.png` 생성.
   중심 (672, 547), 반지름 92px → 256×256으로 확대. 어두운 유리색 바탕을 먼저 깔고 6px 안쪽으로 그린 뒤 은색 테두리(5px)를 둘러 가장자리를 정리.
2. **음소거 TV 제거** — 같은 x 범위의 위쪽 빈 하늘(y 30~380)을 아래로 복제해 덮음.
3. **하단 ABOUT TV 자리 정리** — 우측 빈 바닥(x 750~1010)을 좌우반전해 두 번 이어 붙여 덮음.
4. **ABOUT TV 이동** — 원본 하단의 ABOUT TV(x 328, y 1014, 366×338)를 우상단 빈 슬롯(x 519, y 400, 296×273)으로 옮김.

2~4의 모든 붙여넣기는 **가장자리 alpha를 0으로 떨구는 깃털(feather) 마스크**(14~45px)를 적용해 사각 경계선이 보이지 않게 했습니다.

합성 도구: PowerShell + .NET `System.Drawing` (ImageMagick·sharp·PIL 없이 동작). 보간은 `HighQualityBicubic`.

### 클릭 좌표 실측

`home.css`의 모바일 `--tv-*` 값은 완성된 이미지에서 **화면 유리의 어두운 픽셀 경계를 자동 검출**해 얻었습니다(행마다 60px 이상 연속한 어두운 구간만 화면으로 인정 — 귀·꼬리 같은 장식 제외).

| 역할 | 픽셀 (x, y, w, h) |
|---|---|
| portfolio | 226, 449, 268×236 |
| about | 538, 447, 257×212 |
| yang | 214, 764, 273×245 |
| yin | 542, 764, 276×245 |

이미지를 교체하면 이 검출을 다시 수행해 좌표를 갱신하세요.

## (참고) 이전 5개 TV 모바일 이미지 생성 프롬프트

Use case: compositing. Edit the provided reference image into a portrait mobile website hero artwork. 1024x1536 portrait format. Preserve the exact visual identity of the FIVE rounded polished silver chrome CRT televisions, the same glossy slightly irregular metal, thick curved dark CRT glass, small blue indicator LEDs, two round buttons, white glowing screen symbols. Rearrange the SAME five TVs into THREE rows, with two televisions in the top row, two in the middle row and one centered on the bottom row. Top row: left the yin-yang TV with asymmetric white feather angel wing / glossy black bat wing antenna above it, right the muted speaker TV. Middle row: left the floppy silver dog-ear TV with a large layered white feather wing extending left and a glowing feather wing symbol on its screen; right the pointed black/silver cat-ear TV with curved thin black devil tail ending in arrowhead pointing upward at right, and glowing bat wing on its screen. Bottom row: centered plain TV with the glowing horizontal dash in parentheses symbol (—). All five televisions must be present, individual, large and clearly separated; no cropping, duplication, additions or swapped symbols. TV bodies should have approximately equal width 34% of canvas. Top TV bodies occupy x16%-50% and 51%-85%, y22%-42%; middle bodies x16%-50% and 51%-85%, y48%-68%; bottom centered body x33%-67%, y74%-94%. Wing antenna above top left extends into y10%-22%; white side wing and black tail fit entirely within canvas. Preserve soft pale icy blue cloudy studio background and elegant glossy floor reflections beneath bottom TV, subtle contact shadows. NO outer white margin. NO text anywhere, no logo, no typography, no TOUCH THE or SCREEN, no labels, no menu text, no watermark. Leave upper 0%-9% calm pale-blue sky for a real website header to be added later. Keep the finely rendered photoreal 3D aesthetic, original cool white/silver palette and front camera. Avoid flat vectors, dark outlines, cartoon shading, additional screens, screen text or dramatic perspective. Artwork only, not a phone mockup.
