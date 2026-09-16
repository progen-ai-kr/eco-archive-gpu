// 운영 데이터는 읽기만 하며 구매 가능한 상태는 브라우저 응답에서만 재현합니다.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.MOBILE_BASE_URL || 'http://127.0.0.1:4176';
const output = process.env.MOBILE_SCREENSHOTS || path.join(require('node:os').tmpdir(), 'echo-mobile-qa');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf8'));
const first = data.products.find(p => p.published !== false);
const routes = ['index.html', 'about.html', 'products.html', 'product.html?id=' + encodeURIComponent(first.id), 'portfolio.html', 'contact.html'];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const results = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.on('pageerror', e => errors.push(e.message));
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '화면 가로 넘침: ' + page.url());
  const visit = async route => {
    await page.goto(base + '/' + route);
    if (route.startsWith('products.')) await page.waitForFunction(() => document.querySelector('#product-list').getAttribute('aria-busy') === 'false');
    if (route.startsWith('product.')) await page.locator('.product-info').waitFor();
    if (route.startsWith('portfolio.')) await page.locator('#portfolioContent img').first().waitFor();
    await page.waitForTimeout(400);
  };
  try {
    for (const width of [360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of routes) {
        await visit(route);
        await noOverflow();
        const name = route.split('.')[0];
        const menu = page.locator('.nav-menu, .home-nav');
        assert(await menu.isHidden(), name + ': 메뉴 초기 접힘');
        await page.locator('.nav-toggle').click();
        assert(await menu.isVisible());
        assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'), 'true');
        assert(await menu.locator('a').evaluateAll(es => es.every(e => e.getBoundingClientRect().height >= 44 && parseFloat(getComputedStyle(e).fontSize) >= 16)));
        await page.keyboard.press('Escape');
        assert(await menu.isHidden());
        if (width === 390 || width === 360) await page.screenshot({ path: path.join(output, name + '-' + width + '.png') });
        if (name === 'index') {
          assert.equal(await page.locator('.mobile-tv-label:visible').count(), 4);
          const labels = await page.locator('.mobile-tv-label').evaluateAll(es => es.map(e => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom })));
          assert(labels[0].bottom < labels[2].top, 'TV 이름 겹침 없음');
        }
        if (name === 'about') {
          await page.locator('#scene-memory h2').evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.waitForTimeout(400);
          assert(await page.locator('.about-focus').evaluateAll(es => es.every(e => ['none', 'blur(0px)'].includes(getComputedStyle(e).filter) && getComputedStyle(e).opacity === '1')));
          if (width === 390) await page.screenshot({ path: path.join(output, 'about-reading.png') });
        }
        if (name === 'products') {
          assert.equal(await page.locator('.filter-chip').count(), 0);
          assert.equal(await page.locator('#product-list > a.card').count(), data.products.filter(p => p.published !== false).length);
          assert(await page.locator('.scroll-content').evaluateAll(es => es.every(e => getComputedStyle(e).filter === 'none' && getComputedStyle(e).opacity === '1')));
        }
        if (name === 'contact') {
          assert.equal(await page.locator('.contact-channels').count(), 0);
          const rowLink = page.locator('.contact-item .value a');
          await rowLink.scrollIntoViewIfNeeded();
          const entireRowHit = await rowLink.evaluate(a => { const r = a.closest('.contact-item').getBoundingClientRect(); return document.elementFromPoint(r.right - 8, r.top + r.height / 2) === a; });
          assert(entireRowHit, 'Instagram 행 끝에서도 링크 터치');
        }
      }
      results.push(width + ': 전체 페이지, 메뉴, 넘침, 글씨, 스크롤 확인');
      console.log('PASS: ' + width + ' portrait');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await visit('portfolio.html');
    const zoomButton = page.locator('.portfolio-zoom-open').first();
    await zoomButton.click();
    assert(await page.locator('.image-viewer').evaluate(e => e.open));
    await page.locator('.image-viewer-zoom').click();
    assert.equal(await page.locator('.image-viewer-zoom').getAttribute('aria-pressed'), 'true');
    assert(await page.locator('.image-viewer-canvas').evaluate(e => e.scrollWidth > e.clientWidth));
    await page.screenshot({ path: path.join(output, 'portfolio-original.png') });
    await page.keyboard.press('Escape');
    assert.equal(await zoomButton.evaluate(e => e === document.activeElement), true);
    await zoomButton.click();
    await page.locator('.image-viewer-close').click();
    assert.equal(await page.locator('body.image-viewer-open').count(), 0);
    await zoomButton.click();
    await page.waitForFunction(() => document.querySelector('.image-viewer').open);
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('.image-viewer').open);
    assert(page.url().endsWith('/portfolio.html'), '뒤로 가기는 확대 창만 닫음');
    assert.equal(await zoomButton.evaluate(e => e === document.activeElement), true);
    await page.goForward();
    await page.waitForFunction(() => document.querySelector('.image-viewer').open);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => !document.querySelector('.portfolio-zoom-open'));
    assert.equal(await page.locator('.portfolio-zoom-open').count(), 0);
    assert.equal(await page.locator('.image-viewer').evaluate(e => e.open), false);
    results.push('이미지 확대/원본 스크롤/닫기/뒤로·앞으로 가기/초점 복원/데스크톱 전환');

    // 빈 본문, 실제 구매 링크와 안내창을 모두 확인합니다. 외부 구매는 실행하지 않습니다.
    await page.setViewportSize({ width: 390, height: 844 });
    await visit('product.html?id=' + encodeURIComponent(first.id));
    assert.equal(await page.locator('.product-story').count(), 0, '빈 편집기 본문은 공간을 만들지 않음');
    assert.equal(await page.locator('.mobile-purchase-bar').count(), 0, '판매 준비 상태에는 구매 버튼 없음');
    for (const mode of ['external', 'notice']) {
      // 짧은 화면에서 원래 구매 버튼이 화면 밖으로 나가는 상황을 재현합니다.
      await page.setViewportSize({ width: 390, height: 640 });
      await page.route('**/products.json*', route => route.fulfill({ json: { products: [{ ...first, id: 'mobile-qa', name: '모바일에서 긴 이름의 제품도 자연스럽게 읽히는 상품명', images: [first.images[0], first.images[0]], buyLink: mode === 'external' ? 'https://example.com/shop' : '', buyNotice: mode === 'notice' ? '테스트 구매 안내 문구' : '' }] } }));
      await visit('product.html?id=mobile-qa');
      const next = page.locator('[data-carousel-next]');
      await next.click();
      assert.equal(await page.locator('[data-carousel-current]').textContent(), '2');
      assert(await page.locator('.product-carousel-dot').evaluateAll(es => es.every(e => e.getBoundingClientRect().width >= 44 && e.getBoundingClientRect().height >= 44)));
      await page.locator('.product-info .product-buy').scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      assert(await page.locator('.mobile-purchase-bar').isHidden());
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(150);
      assert(await page.locator('.mobile-purchase-bar').isVisible());
      await page.screenshot({ path: path.join(output, 'product-buy-' + mode + '.png') });
      const action = page.locator('.mobile-purchase-bar .product-buy');
      if (mode === 'external') assert.equal(await action.getAttribute('href'), 'https://example.com/shop');
      else {
        await action.click();
        assert(await page.locator('#purchaseDialog').evaluate(e => e.open));
        await page.locator('.purchase-dialog-close').click();
        assert.equal(await page.locator('#purchaseDialog').evaluate(e => e.open), false);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForFunction(() => !document.querySelector('.mobile-purchase-bar'));
      assert.equal(await page.locator('.mobile-purchase-bar').count(), 0);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.unroute('**/products.json*');
    }
    results.push('빈 본문·판매 준비·외부 구매 연결·구매 안내·캐러셀·하단 버튼');

    await page.setViewportSize({ width: 360, height: 780 });
    for (const state of ['empty', 'failed']) {
      await page.route('**/products.json*', route => state === 'failed' ? route.abort() : route.fulfill({ json: { products: [] } }));
      await visit('products.html');
      assert(await page.locator('.portfolio-status').isVisible());
      assert.equal(await page.locator('.card-placeholder').count(), 0, '빈 상태에 긴 로딩 카드가 남지 않음');
      await noOverflow();
      await page.screenshot({ path: path.join(output, 'products-' + state + '.png') });
      await page.unroute('**/products.json*');
      if (state === 'failed') {
        await page.locator('[data-retry-products]').click();
        await page.locator('#product-list > a.card').first().waitFor();
      }
    }
    await page.goto(base + '/product.html?id=missing-mobile-qa');
    await page.getByRole('heading', { name: '제품을 찾을 수 없습니다.' }).waitFor();
    assert.equal(await page.locator('.mobile-purchase-bar').count(), 0);
    await page.getByRole('link', { name: '제품 목록으로 돌아가기' }).click();
    await page.waitForURL('**/products.html');
    results.push('모바일 빈 목록·통신 실패·재시도 복구·없는 제품에서 목록 복귀');

    await visit('index.html');
    await page.locator('.nav-toggle').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    assert(await page.locator('.home-nav a').first().evaluate(e => e === document.activeElement));
    await page.keyboard.press('Escape');
    assert(await page.locator('.nav-toggle').evaluate(e => e === document.activeElement));
    results.push('키보드로 메뉴 열기·항목 이동·닫기·초점 복원');

    for (const route of routes) {
      await page.setViewportSize({ width: 360, height: 780 });
      await visit(route);
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      await noOverflow();
      await page.locator('.nav-toggle').click();
      await noOverflow();
      await page.locator('.nav-toggle').click();
    }
    results.push('전체 페이지 모바일 글자 확대, 메뉴 넘침 없음');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of routes) {
      await visit(route);
      await noOverflow();
      assert(await page.locator('.scroll-content, .about-focus').evaluateAll(es => es.every(e => getComputedStyle(e).transform === 'none' && getComputedStyle(e).filter === 'none' && getComputedStyle(e).opacity === '1')));
    }
    results.push('동작 줄이기 설정');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ results, errors, screenshots: output }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
