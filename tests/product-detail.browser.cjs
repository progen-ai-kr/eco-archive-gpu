// 실제 공개 상품은 읽기만 하고, 관리자 입력 예외는 브라우저 응답으로 재현합니다.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PRODUCT_BASE_URL || 'http://127.0.0.1:4183';
const output = process.env.PRODUCT_SCREENSHOTS || path.join(require('node:os').tmpdir(), 'echo-product-detail');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = process.env.BROWSER_CDP ? await chromium.connectOverCDP(process.env.BROWSER_CDP) : await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const local = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf8'));
  const liveResponse = await context.request.get('https://eco-archive-gpu.progen-web.workers.dev/products.json');
  assert(liveResponse.ok(), '공개 상품 데이터 응답');
  const live = await liveResponse.json();
  const products = live.products.filter(p => p && p.published !== false);
  assert.deepEqual(local.products, live.products, '현재 작업본과 공개 운영 상품 일치');
  async function visit(id) {
    await page.goto(base + '/product.html?id=' + encodeURIComponent(id));
    await page.locator('.product-info').waitFor();
    await page.waitForTimeout(1050);
  }
  async function overflow() {
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침 없음');
  }
  try {
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '/products.html');
      await page.waitForFunction(() => document.querySelector('#product-list').getAttribute('aria-busy') === 'false');
      const ids = await page.locator('#product-list a[href*="product.html?id="]').evaluateAll(es => es.map(e => new URL(e.href).searchParams.get('id')));
      products.forEach(p => assert(ids.includes(p.id), p.name + ': SHOP 노출'));
      for (const product of products) {
        await visit(product.id);
        assert.equal(await page.locator('.product-info h1').textContent(), product.name);
        assert.equal(await page.locator('.product-hero-image img').first().getAttribute('src'), product.images[0]);
        assert.equal(await page.locator('.tv-frame').count(), 0, '금색 프레임 제거');
        assert.equal(await page.locator('.mobile-reveal-shell').count(), 0, '편집기 구조를 감싸지 않음');
        const expected = await page.evaluate(p => {
          const t = document.createElement('template');
          t.innerHTML = p.sections.filter(s => s.type === 'rich_text').map(s => ProductCatalog.sanitizeRichText(s.body)).join('');
          return Array.from(t.content.querySelectorAll('img')).map(i => i.getAttribute('src'));
        }, product);
        assert.deepEqual(await page.locator('.product-rich-text img').evaluateAll(es => es.map(e => e.getAttribute('src'))), expected);
        if (width === 390 && product === products[0]) await page.screenshot({ path: path.join(output, 'product-390-top.png') });
        if (width === 1440 && product === products[0]) await page.screenshot({ path: path.join(output, 'product-1440-top.png') });
        for (const image of await page.locator('.product-rich-text img').all()) {
          await image.scrollIntoViewIfNeeded();
          await page.waitForFunction(img => img.complete && img.naturalWidth > 0, await image.elementHandle(), { timeout: 10000 });
          await image.evaluate(img => img.decode());
          assert(await image.evaluate(img => img.naturalWidth > 0), '상세 이미지 로드');
          await overflow();
        }
        await page.locator('.product-back .btn').scrollIntoViewIfNeeded();
        await page.waitForTimeout(950);
        await overflow();
        assert.equal(await page.locator('.product-back .btn').evaluate(e => getComputedStyle(e).borderRadius), '4px');
        if (width === 390 && product === products[0]) await page.screenshot({ path: path.join(output, 'product-390-bottom.png') });
      }
      console.log('PASS 실제 상품 ' + products.length + '개: ' + width + 'px / 목록·이름·대표사진·본문사진·버튼');
    }

    // 늦게 로드되는 상품도 첫 화면에서 좌우 등장하고 사진마다 개별 등장하는지 확인합니다.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/products.json', async route => {
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.fulfill({ json: live });
    });
    await page.goto(base + '/product.html?id=' + products[0].id);
    await page.locator('.product-info').waitFor();
    await page.waitForTimeout(140);
    const start = await page.locator('.product-hero-gallery').evaluate(e => ({ opacity: +getComputedStyle(e).opacity, x: parseFloat(getComputedStyle(e).translate) }));
    assert(start.opacity < 1 && start.x < 0, '대표 사진 왼쪽 등장 중');
    await page.waitForTimeout(1050);
    assert.equal(await page.locator('.product-hero-gallery').evaluate(e => getComputedStyle(e).opacity), '1');
    const images = page.locator('.product-rich-text img');
    assert(await images.count() > 1);
    assert.equal(await images.locator('xpath=..').first().evaluate(e => e.tagName), 'P', '원본 문단 유지');
    assert(await images.evaluateAll(es => es.every(e => e.hasAttribute('data-product-reveal'))), '사진별 효과');
    await images.last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1050);
    assert.equal(await images.last().evaluate(e => getComputedStyle(e).opacity), '1');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    assert.equal(await images.last().evaluate(e => e.classList.contains('product-entered')), false, '화면 밖에서 재등장 준비');
    await page.unroute('**/products.json');

    // 등록 내용(정렬, 표, 갤러리, 영상, 구매 안내)을 합성해 공개 UI와의 연결을 확인합니다.
    const source = products[0].images[0];
    const fixture = { ...products[0], id: 'qa-detail', name: '관리자 등록 확인', images: [source, source],
      buyNotice: '등록한 구매 안내\n두 번째 줄', buyLink: '', buyLabel: '구매 안내 보기',
      sections: [{ type: 'rich_text', body: '<h2 data-align="center">상품 설명</h2><p>텍스트와 <strong>강조</strong></p>' +
        '<section data-brand-gallery="2"><img src="' + source + '"><img src="' + source + '"></section>' +
        '<table><tbody><tr><th>사이즈</th><td>관리자 입력</td></tr></tbody></table><ul><li>관리 방법</li></ul>' +
        '<p><a href="https://example.com/detail">상세 링크</a></p><iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>' }] };
    await page.route('**/products.json', route => route.fulfill({ json: { products: [fixture] } }));
    await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>영상 테스트</p>' }));
    await visit(fixture.id);
    assert.equal(await page.locator('.product-rich-text h2').evaluate(e => getComputedStyle(e).textAlign), 'center');
    assert.equal(await page.locator('[data-brand-gallery] > img').count(), 2);
    assert.equal(await page.locator('.product-rich-text table td').textContent(), '관리자 입력');
    assert.equal(await page.locator('.product-rich-text iframe').count(), 1);
    await page.locator('[data-carousel-next]').click();
    assert.equal(await page.locator('[data-carousel-current]').textContent(), '2');
    await page.locator('[data-carousel-next]').press('ArrowLeft');
    assert.equal(await page.locator('[data-carousel-current]').textContent(), '1');
    await page.locator('.product-info [data-purchase-dialog]').click();
    assert(await page.locator('#purchaseDialog').evaluate(e => e.open));
    assert.equal(await page.locator('#purchaseDialogContent').textContent(), fixture.buyNotice);
    await page.locator('.purchase-dialog-actions .btn').click();
    await page.locator('.product-back .btn').scrollIntoViewIfNeeded();
    await page.locator('.mobile-purchase-bar').waitFor({ state: 'visible' });
    await page.locator('.mobile-purchase-bar .btn').click();
    assert(await page.locator('#purchaseDialog').evaluate(e => e.open));
    await page.keyboard.press('Escape');
    fixture.buyLink = 'https://example.com/buy';
    await visit(fixture.id);
    assert.equal(await page.locator('.product-info .product-buy').getAttribute('href'), fixture.buyLink);
    assert.equal(await page.locator('.product-info .product-buy').getAttribute('target'), '_blank');
    fixture.buyLink = 'javascript:alert(1)'; fixture.buyNotice = '';
    await visit(fixture.id);
    assert.equal(await page.locator('.product-buy').count(), 0, '안전하지 않은 구매 링크 숨김');
    fixture.published = false;
    await page.goto(base + '/product.html?id=' + fixture.id);
    await page.getByRole('heading', { name: '제품을 찾을 수 없습니다.' }).waitFor();
    assert.equal(await page.locator('.product-info').count(), 0, '비공개 상품 숨김');
    await page.unroute('**/products.json');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await visit(products[0].id);
    assert(await page.locator('[data-product-reveal]').evaluateAll(es => es.every(e => getComputedStyle(e).opacity === '1' && getComputedStyle(e).translate === 'none')));
    assert.deepEqual(errors, [], '브라우저 실행 오류 없음');
    console.log('PASS 지연 로딩·좌우 효과·재등장·편집기 서식·캐러셀·구매 안내·외부 구매·비공개·동작 줄이기');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
