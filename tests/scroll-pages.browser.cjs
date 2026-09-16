// 정적 서버와 개발 환경의 Playwright로 실행합니다. 운영 데이터는 수정하지 않습니다.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SCROLL_BASE_URL || 'http://127.0.0.1:4176';
const output = process.env.SCROLL_SCREENSHOTS || path.join(require('node:os').tmpdir(), 'echo-scroll-qa');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf8'));

(async function () {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const results = [];
  async function newPage(options = {}, init) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options });
    page.on('pageerror', error => errors.push(error.message));
    if (init) await page.addInitScript(init);
    return page;
  }
  async function visit(page, route) {
    await page.goto(base + '/' + route + '.html');
    if (route === 'products') await page.waitForFunction(() => document.querySelector('#product-list').getAttribute('aria-busy') === 'false');
    await page.waitForTimeout(850);
  }
  async function center(locator) {
    await locator.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await locator.page().waitForTimeout(850);
  }
  async function noOverflow(page) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, '화면 가로 넘침');
  }
  try {
    const page = await newPage();
    for (const route of ['products', 'contact']) {
      for (const width of [1440, 768, 390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        await visit(page, route);
        await noOverflow(page);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('body.has-scroll-motion').count(), 1);
        await page.screenshot({ path: path.join(output, route + '-' + width + '-top.png') });
        const units = page.locator('main [data-scroll]');
        for (let index = 0; index < await units.count(); index++) {
          const unit = units.nth(index);
          if (!await unit.isVisible()) continue;
          await unit.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.waitForTimeout(50);
          assert(await unit.evaluate(element => element.classList.contains('scroll-focused')), route + ': 중앙 요소 선명화');
        }
        await noOverflow(page);
        const sample = route === 'products' ? page.locator('.card-img').first() : page.locator('.contact-mail-link');
        await center(sample);
        assert.equal(await sample.locator(':scope > .scroll-content').evaluate(e => getComputedStyle(e).opacity), '1');
        await page.screenshot({ path: path.join(output, route + '-' + width + '-focus.png') });
        await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
        await page.waitForTimeout(350);
        const inKeepBand = await sample.evaluate(e => { const r = e.getBoundingClientRect(); return r.bottom > innerHeight * .04 && r.top < innerHeight * .96; });
        assert.equal(await sample.evaluate(e => e.classList.contains('scroll-focused')), inKeepBand, '짧은 페이지에서도 실제 화면 위치에 따라 초점 유지/해제');
        await center(sample);
        assert.equal(await sample.locator(':scope > .scroll-content').evaluate(e => getComputedStyle(e).opacity), '1', '역스크롤 복원');
        // 초점 진입 경계 근처를 왕복해도 유지 경계 안에서는 깜빡이지 않습니다.
        const edge = await sample.evaluate(e => e.getBoundingClientRect().bottom + scrollY);
        const middle = 900 * ((width < 720 ? .08 : .14) + .04) / 2;
        for (let i = 0; i < 6; i++) {
          await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), edge - middle + (i % 2 ? 3 : -3));
          await page.waitForTimeout(40);
          assert(await sample.evaluate(e => e.classList.contains('scroll-focused')), '초점 경계 깜빡임 방지');
        }
        if (width < 900) {
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await page.locator('.nav-toggle').click();
          assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'), 'true');
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'), 'false');
        }
        results.push(route + ' ' + width + ': 순/역방향·초점 경계·넘침·메뉴 통과');
      }
    }
    console.log('PASS: 화면 크기별 스크롤 검사');

    await page.setViewportSize({ width: 1440, height: 900 });
    await visit(page, 'products');
    assert.equal(await page.locator('.filter-chip, #productFilterRail, .products-toolbar-section').count(), 0);
    assert.equal(await page.locator('#product-list > a.card').count(), data.products.filter(p => p.published !== false).length);
    assert.equal(await page.locator('.scroll-content .scroll-content').count(), 0, '중복 감싸기 방지');
    const card = page.locator('#product-list > a.card').first();
    await card.focus();
    await page.waitForTimeout(350);
    assert(await card.locator('.scroll-content').evaluateAll(es => es.every(e => getComputedStyle(e).opacity === '1' && getComputedStyle(e).filter === 'none')));
    await page.locator('#product-list > a.card').first().click();
    await page.waitForURL('**/product.html?id=*');
    results.push('필터 제거·전체 제품 표시·키보드 초점·상세 링크 통과');

    for (const route of ['products', 'contact']) {
      await visit(page, route);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(150);
      assert.equal(await page.locator('body.has-scroll-motion').count(), 0);
      assert(await page.locator('.scroll-content').evaluateAll(es => es.every(e => getComputedStyle(e).opacity === '1' && getComputedStyle(e).filter === 'none' && getComputedStyle(e).transform === 'none')));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForTimeout(150);
      assert.equal(await page.locator('body.has-scroll-motion').count(), 1);
      await page.setViewportSize({ width: 360, height: 780 });
      await page.addStyleTag({ content: 'main p, main a, main h2, main h3 {font-size:200%!important}' });
      await noOverflow(page);
      results.push(route + ': 동작 줄이기 전환/복원·글자 확대 통과');
    }

    for (const mode of ['noJS', 'noIO', 'reduced']) {
      const fallback = await newPage(mode === 'noJS' ? { javaScriptEnabled: false } : mode === 'reduced' ? { reducedMotion: 'reduce' } : {}, mode === 'noIO' ? () => { delete window.IntersectionObserver; } : undefined);
      for (const route of ['contact', 'products']) {
        await fallback.goto(base + '/' + route + '.html');
        await fallback.waitForTimeout(400);
        assert.equal(await fallback.locator('body.has-scroll-motion').count(), 0);
        if (route === 'contact') assert.equal(await fallback.locator('main a[href^="mailto:"]').count(), 1);
        if (route === 'products' && mode === 'noJS') assert(await fallback.locator('noscript').isVisible());
        await noOverflow(fallback);
      }
      await fallback.close();
      results.push(mode + ': 내용과 문의 링크 유지');
    }
    console.log('PASS: 전체 목록·접근성·대체 동작 검사');

    // 로딩 결과만 가로채므로 products.json이나 운영 데이터는 바뀌지 않습니다.
    for (const mode of ['empty', 'failed', 'many', 'single']) {
      const scenario = await newPage();
      await scenario.route('**/products.json*', route => {
        if (mode === 'failed') return route.abort();
        const products = mode === 'empty' ? [] : mode === 'single' ? data.products.slice(0, 1) : Array.from({ length: 12 }, (_, i) => ({ ...data.products[i % data.products.length], id: 'qa-' + i }));
        return route.fulfill({ json: { products } });
      });
      await visit(scenario, 'products');
      await noOverflow(scenario);
      if (['empty', 'failed'].includes(mode)) {
        assert(await scenario.locator('.portfolio-status').isVisible());
        assert.equal(await scenario.locator('#productFilterRail').count(), 0);
      } else {
        assert.equal(await scenario.locator('#product-list > a.card').count(), mode === 'single' ? 1 : 12);
        assert.equal(await scenario.locator('#productFilterRail').count(), 0);
        await center(scenario.locator('#product-list > a.card').last());
        assert(await scenario.locator('#product-list > a.card').last().locator('[data-scroll]').evaluateAll(es => es.every(e => e.classList.contains('scroll-seen'))));
      }
      await scenario.close();
      results.push(mode + ': 목록 상태 처리 통과');
    }
    await visit(page, 'contact');
    for (const link of await page.locator('main a[href^="mailto:"]').all()) {
      assert.equal(new URL(await link.getAttribute('href')).pathname, 'echo_archive@gmail.com');
      await link.focus();
      assert(await link.evaluate(e => e === document.activeElement));
    }
    await page.locator('.contact-return a').click();
    await page.waitForURL('**/index.html');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ results, pageErrors: errors, screenshots: output }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
