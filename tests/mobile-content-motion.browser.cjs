// 실행 중인 로컬 사이트에서 실제 상품 연결·모바일 효과·터치 기능을 확인합니다.
// 운영 JSON은 읽기만 하고, 예외 상황은 브라우저 응답으로만 재현합니다.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.MOBILE_BASE_URL || 'http://127.0.0.1:4183';
const output = process.env.MOBILE_SCREENSHOTS || path.join(require('node:os').tmpdir(), 'echo-mobile-motion');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf8'));
const visible = data.products.filter(p => p && p.published !== false);
const first = visible.find(p => p.images && p.images[0]);
const routes = ['index.html', 'about.html', 'products.html', 'product.html?id=' + encodeURIComponent(first.id), 'portfolio.html', 'contact.html'];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = process.env.BROWSER_CDP
    ? await chromium.connectOverCDP(process.env.BROWSER_CDP)
    : await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  const checks = [];
  page.on('pageerror', e => errors.push(e.message));
  async function visit(route) {
    await page.goto(base + '/' + route);
    if (route.startsWith('about')) await page.waitForFunction(() => document.querySelector('[data-about-product-image]').dataset.imageStatus);
    if (route.startsWith('products')) await page.waitForFunction(() => document.querySelector('#product-list').getAttribute('aria-busy') === 'false');
    if (route.startsWith('product.')) await page.locator('.product-info').waitFor();
    if (route.startsWith('portfolio')) await page.locator('#portfolioContent img').first().waitFor();
    await page.waitForTimeout(950);
  }
  async function noOverflow(label) {
    const sizes = await page.evaluate(() => ({ width: innerWidth, page: document.documentElement.scrollWidth }));
    assert(sizes.page <= sizes.width + 1, label + ': 가로 넘침 ' + JSON.stringify(sizes));
  }
  try {
    for (const width of [360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of routes) {
        await visit(route);
        const name = route.split('.')[0];
        assert(await page.locator('body').evaluate(e => e.classList.contains('has-mobile-enter')), name + ': 모바일 효과 활성화');
        await noOverflow(name);
        if (await page.locator('.nav-toggle').isVisible()) {
          await page.locator('.nav-toggle').click();
          assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'), 'true');
          assert(await page.locator('#primaryNav').isVisible());
          assert(await page.locator('#primaryNav a:visible').evaluateAll(es => es.every(e => e.getBoundingClientRect().height >= 44)));
          await page.keyboard.press('Escape');
          assert(await page.locator('#primaryNav').isHidden());
        } else {
          assert(name === 'index' && width >= 720, '홈은 720px부터 데스크톱 메뉴');
          assert(await page.locator('#primaryNav').isVisible());
        }
        if (width === 390) await page.screenshot({ path: path.join(output, name + '-390-top.png') });
        const steps = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / 600));
        for (let i = 0; i <= steps; i++) {
          await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), i * 600);
          await page.waitForTimeout(35);
          await noOverflow(name + ' / ' + i);
        }
        await page.waitForTimeout(800);
        if (name === 'index' && width < 720) {
          assert(await page.locator('.archive-admin').evaluate(a => {
            const rect = a.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return hit === a || a.contains(hit);
          }), '홈의 ADMIN 링크가 음향 버튼에 가려지지 않음');
          assert(await page.locator('.archive-footer-copy').evaluate(e => parseFloat(getComputedStyle(e).fontSize) >= 11));
        }
        if (width === 390) await page.screenshot({ path: path.join(output, name + '-390-bottom.png') });
        if (name === 'about') {
          const slots = await page.locator('[data-about-product-image]').evaluateAll(es => es.map(e => ({ src: e.getAttribute('src'), id: e.dataset.productId, alt: e.alt })));
          const sources = visible.filter(p => p.images && p.images[0]);
          assert.equal(slots.length, 7);
          slots.forEach((slot, i) => {
            assert.equal(slot.src, sources[i % sources.length].images[0]);
            assert.equal(slot.id, sources[i % sources.length].id);
          });
          assert.equal(await page.locator('header .logo img').getAttribute('src'), 'images/brand/echo-archive-logo.png');
          assert.equal(await page.locator('#scene-craft img').getAttribute('src'), 'images/brand/echo-archive-logo.png');
        }
      }
      checks.push(width + 'px: 6개 페이지 / 전체 스크롤 넘침 / 메뉴 / 상품 사진 연동');
      console.log('PASS ' + width + 'px');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of routes.filter(r => r !== 'index.html')) {
      await visit(route);
      const target = await page.locator('[data-mobile-anchor]').evaluateAll(es => {
        const node = es.find(e => e.getBoundingClientRect().top > innerHeight + 100 && e.getBoundingClientRect().height < innerHeight);
        if (!node) return null;
        node.dataset.motionCheck = 'true';
        return node.getBoundingClientRect().top + scrollY;
      });
      assert(target !== null, route + ': 화면 밖 효과 대상');
      const anchor = page.locator('[data-motion-check]');
      const moving = anchor.locator(':scope > [data-mobile-motion]').first();
      assert.notEqual(await moving.evaluate(e => getComputedStyle(e).translate), '0px');
      await page.evaluate(y => scrollTo({ top: y - 300, behavior: 'instant' }), target);
      await page.waitForTimeout(100);
      const mid = await moving.evaluate(e => ({ opacity: Number(getComputedStyle(e).opacity), translate: getComputedStyle(e).translate }));
      assert(mid.opacity > .25 && mid.opacity < 1, route + ': 실제 중간 프레임 ' + JSON.stringify(mid));
      await page.waitForTimeout(800);
      assert.equal(await moving.evaluate(e => getComputedStyle(e).opacity), '1');
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(850);
      assert.equal(await anchor.evaluate(e => e.classList.contains('mobile-entered')), false, '역스크롤 재등장 준비');
    }
    checks.push('5개 서브페이지: 이동 중간 프레임 / 도착 후 선명도 / 역스크롤 재등장');

    await visit('portfolio.html');
    const zoom = page.locator('.portfolio-zoom-open').first();
    await zoom.click();
    assert(await page.locator('.image-viewer').evaluate(e => e.open));
    await page.locator('.image-viewer-zoom').click();
    assert(await page.locator('.image-viewer-canvas').evaluate(e => e.scrollWidth > e.clientWidth));
    await page.keyboard.press('Escape');
    assert(await zoom.evaluate(e => e === document.activeElement));
    checks.push('ARCHIVE 이미지 확대 / 원본 보기 / 닫기 / 초점 복귀');

    await visit('about.html');
    await page.locator('#scene-memory h2').evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(output, 'about-390-reading.png') });
    await page.locator('#scene-craft').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(output, 'about-390-craft.png') });

    for (const route of routes) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await visit(route);
      assert.equal(await page.locator('body.has-mobile-enter').count(), 0);
      await noOverflow(route + ' / reduced');
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    checks.push('6개 페이지: 움직임 최소화 설정');

    await page.setViewportSize({ width: 844, height: 390 });
    for (const route of routes) {
      await visit(route);
      await noOverflow(route + ' / landscape');
    }
    checks.push('844×390 가로 화면: 6개 페이지 넘침 없음');
    await page.setViewportSize({ width: 390, height: 844 });

    // 운영 파일을 수정하지 않고 단일 상품·비공개·빈 데이터·실패를 재현합니다.
    for (const mode of ['one', 'empty', 'failure', 'unsafe']) {
      await page.route('**/products.json', route => mode === 'failure' ? route.fulfill({ status: 503, body: '' }) : route.fulfill({ json: { products: mode === 'empty' ? [] : [
        { ...first, id: 'hidden', published: false },
        { ...first, id: 'preview', name: '<태그> 상품명', images: [mode === 'unsafe' ? 'javascript:alert(1)' : first.images[0]] }
      ] } }));
      await visit('about.html');
      const slots = await page.locator('[data-about-product-image]').evaluateAll(es => es.map(e => ({ src: e.getAttribute('src'), status: e.dataset.imageStatus, alt: e.alt })));
      assert(slots.every(slot => mode === 'one' ? slot.src === first.images[0] && slot.alt === '<태그> 상품명 대표 이미지' : slot.src === 'images/brand/echo-archive-logo.png'));
      await noOverflow(mode);
      await page.unroute('**/products.json');
    }
    checks.push('단일 상품 순환 / 비공개 제외 / 빈 데이터 / 로딩 실패 / 안전하지 않은 URL 제외');

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
      await visit(route);
      assert.equal(await page.locator('body.has-mobile-enter').count(), 0);
      await noOverflow(route + ' / desktop');
    }
    checks.push('데스크톱 1440px: 모바일 효과 해제 / 가로 넘침 없음');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
