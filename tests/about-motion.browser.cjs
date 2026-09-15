// 실행 전 정적 서버를 켜세요. Playwright는 개발 환경에서만 사용하며 사이트 의존성에 추가하지 않습니다.
// ABOUT_BASE_URL과 PLAYWRIGHT_MODULE로 서버 주소와 설치된 패키지 위치를 지정할 수 있습니다.
const baseURL = process.env.ABOUT_BASE_URL || 'http://127.0.0.1:4174';
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(); const errors=[]; const results=[];
 async function page(options={},init){const p=await browser.newPage({viewport:{width:1440,height:900},...options});p.on('pageerror',e=>errors.push(e.message));if(init)await p.addInitScript(init);await p.goto(baseURL + '/about.html');await p.waitForTimeout(500);return p;}
 const p=await page();
 for(const width of [1440,390]){
  await p.setViewportSize({width,height:900});await p.reload();await p.waitForTimeout(500);
  const e=p.locator('#scene-memory .about-scene-copy > p').nth(3);
  await e.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(250);
  assert(await e.evaluate(e=>e.classList.contains('is-focused')));
  const bounds=await p.evaluate(()=>{const t=innerWidth<900?Math.ceil(document.querySelector('.about-progress').getBoundingClientRect().height):16;const u=innerHeight-t-16;return{entry:t+u*(innerWidth<900?.1:.15),keep:t+u*(innerWidth<900?.05:.1)};});
  const end=await e.evaluate(e=>e.getBoundingClientRect().bottom+scrollY);
  // 진입 경계 밖이지만 유지 경계 안에 있는 문단을 10회 왕복합니다.
  const middle=(bounds.entry+bounds.keep)/2;
  for(let i=0;i<10;i++){await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),end-middle+(i%2?5:-5));await p.waitForTimeout(40);assert(await e.evaluate(e=>e.classList.contains('is-focused')));}
  await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),end-bounds.keep+20);await p.waitForTimeout(400);
  assert(!(await e.evaluate(e=>e.classList.contains('is-focused'))));
  assert.match(await e.locator('.about-focus').evaluate(e=>getComputedStyle(e).filter),width<900?/6px/:/14px/);
  await e.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(250);
  assert.equal(await e.locator('.about-focus').evaluate(e=>getComputedStyle(e).filter),'blur(0px)');
  results.push(width+': 진입/유지/이탈 흐림/역스크롤, 10회 왕복 통과');
 }
 await p.setViewportSize({width:1440,height:900});await p.reload();await p.waitForTimeout(500);
 const archive=await p.locator('#scene-episode').evaluate(e=>({top:e.offsetTop,height:e.offsetHeight}));
 const transforms=[];
 for(const fraction of [0,.5,.95,.5]){await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),archive.top+(archive.height-900)*fraction);await p.waitForTimeout(250);transforms.push(await p.locator('.about-archive-track').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41));assert(await p.locator('#scene-episode .about-archive-card .about-focus-anchor').evaluateAll(es=>es.every(e=>e.classList.contains('is-focused'))));}
 assert(transforms[1]<transforms[0]&&transforms[2]<transforms[1]&&transforms[3]>transforms[2]);
 results.push('아카이브 정방향/역방향 및 사진·캡션 초점 통과');
 for(const id of ['memory','translate','everyday','episode','craft']){await p.goto(baseURL + '/about.html#scene-'+id);await p.waitForTimeout(700);assert(await p.locator('#scene-'+id+' h2').evaluate(e=>e.classList.contains('is-focused')));}
 await p.locator('.about-cta a').focus();assert.equal(await p.locator('.about-cta a').evaluate(e=>getComputedStyle(e).filter),'none');
 results.push('5개 직접 해시 진입 및 CTA 키보드 포커스 통과');
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);assert.equal(await p.locator('.has-archive-scroll').count(),0);assert(await p.locator('.about-focus').evaluateAll(es=>es.every(e=>getComputedStyle(e).filter==='none')));await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(150);assert(await p.locator('body').evaluate(e=>e.classList.contains('has-about-motion')));results.push('도중 동작 줄이기 전환/복구 통과');
 for(const mode of ['noJS','noIO','noTimeline','reduced']){
  const q=await page(mode==='noJS'?{javaScriptEnabled:false}:mode==='reduced'?{reducedMotion:'reduce'}:{},mode==='noIO'?()=>{delete window.IntersectionObserver;}:mode==='noTimeline'?()=>{const orig=CSS.supports.bind(CSS);CSS.supports=(...args)=>args[0]==='animation-timeline'?false:orig(...args);}:undefined);
  assert.equal(await q.locator('.has-archive-scroll').count(),0);
  if(mode!=='noTimeline') assert.equal(await q.locator('body.has-about-motion').count(),0);
  assert.equal(await q.locator('.about-archive-card').count(),4);
  assert.equal(await q.locator('h1').count(),1);
  await q.close();results.push(mode+': 정적 콘텐츠/대체 배치 통과');
 }
 await p.setViewportSize({width:390,height:844});await p.goto(baseURL + '/about.html');await p.locator('.nav-toggle').click();assert.equal(await p.locator('.nav-toggle').getAttribute('aria-expanded'),'true');await p.locator('.nav-toggle').click();results.push('모바일 메뉴 열기/닫기 통과');
 await p.setViewportSize({width:1440,height:900});await p.reload();await p.addStyleTag({content:'.about-page .about-scene-copy {font-size:30px!important} .about-page .about-scene-copy h2{font-size:80px!important} .about-page .about-scene-lead{font-size:40px!important} .about-page .about-scene-meta{font-size:18px!important}'});await p.waitForTimeout(400);assert.equal(await p.locator('.has-archive-scroll').count(),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);results.push('본문·제목 200% 확대 시 고정 해제/넘침 없음');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,pageErrors:errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
