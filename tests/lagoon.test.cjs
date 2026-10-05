const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(process.env.INDEX_FILE || require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function source(name) {
  const start = script.indexOf('function ' + name + '(');
  const next = script.indexOf('\nfunction ', start + 1);
  return script.slice(start, next < 0 ? script.indexOf("\n$('#startBtn')", start) : next);
}
function harness() {
  const nodes = new Map();
  class Element {
    constructor() {
      this.children = []; this.style = {}; this.dataset = {}; this.textContent = ''; this.className = '';
      this.classList = {
        contains: c => this.className.split(' ').includes(c),
        add: c => { if (!this.classList.contains(c)) this.className += ' ' + c; },
        remove: c => { this.className = this.className.split(' ').filter(v => v !== c).join(' '); }
      };
    }
    set innerHTML(value) {
      this.children = [];
      for (const match of value.matchAll(/id="([^"]+)"[^>]*>([^<]*)/g)) { const el = new Element(); el.textContent = match[2]; nodes.set('#' + match[1], el); }
    }
    appendChild(el) { this.children.push(el); }
    closest(selector) { if(selector==='button')return this;return this.classList.contains(selector.slice(1)) ? this : null; }
    animate() {}
  }
  let time = 0, serial = 0;
  const jobs = new Map();
  function schedule(fn, delay, interval) { const id = ++serial; jobs.set(id, {fn, at: time + delay, interval}); return id; }
  const context = {
    $: selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); },
    document: {createElement: () => new Element()},
    clearLevelJobs:()=>{}, $$: () => Array.from({length:4},()=>new Element()), setGuide: () => {}, intro: () => '', chime: () => {}, toast: () => {}, update: () => {}, celebrate: () => {}, recordHall: () => {},
    state: {hearts: 3, completed: [1,2,3,4,5], unlocked: 6, coins: 0, stars: 0, chapter: 2},
    meta: {6:{time:95,coins:140,stars:4,title:'Enchanted Forest'},7:{time:90,coins:150,stars:4,title:'Mermaid Lagoon'},8:{time:100,coins:180,stars:4,title:'Dragon Mountain'}},
    current: 6, seconds: 0, timerId: null, levelJobs: new Set(), levelFrames: new Set(), levelComplete: false,
    window: {scrollTo:()=>{}}, screens: {level:new Element(),map:new Element(),reward:new Element(),dreamgate:new Element(),finale:new Element()}, show: screen => { context.screen = screen; },
    setTimeout: (fn, ms) => schedule(fn, ms, 0), setInterval: (fn, ms) => schedule(fn, ms, ms),
    clearInterval: id => jobs.delete(id), clearTimeout: id => jobs.delete(id), requestAnimationFrame: fn => schedule(() => fn(time),16,0), cancelAnimationFrame: id => jobs.delete(id), Math
  };
  vm.createContext(context);
  for (const n of [3,9,10,11,12,13,14,15]) context.meta[n]={time:120,coins:200,stars:5,title:'Level '+n};
  for (const name of ['show','sequence','skyTemple','islandHeart','dreamGarden','mirrorLake','cloudLibrary','clockTower','dreamPalace','levelTimeout','levelInterval','levelFrame','clearLevelJobs','startTimer','drawTimer','lose','forestTrail','lagoon','dragon','complete']) { const body=source(name); if(body.startsWith('function '+name+'(')) vm.runInContext(body, context); }
  const actualShow=context.show;context.show=screen=>{context.screen=screen;actualShow(screen)};
  context.recordHall=()=>{};context.renderMap = () => {};
  vm.runInContext(script.slice(script.indexOf("$('#rewardNext').onclick="), script.indexOf("\n$('#enterDreamsBtn')")), context);
  context.render = n => ({3:context.sequence,6:context.forestTrail,7:context.lagoon,8:context.dragon,9:context.skyTemple,10:context.islandHeart,11:context.dreamGarden,12:context.mirrorLake,13:context.cloudLibrary,14:context.clockTower,15:context.dreamPalace}[n])();
  function tick(ms) {
    const end = time + ms;
    for (;;) {
      const entries = [...jobs.entries()].filter(([, j]) => j.at <= end).sort((a,b) => a[1].at - b[1].at);
      if (!entries.length) break;
      const [id, job] = entries[0]; time = job.at;
      if (job.interval) job.at += job.interval; else jobs.delete(id);
      job.fn();
    }
    time = end;
  }
  function enter(n) { context.clearLevelJobs(); context.levelComplete=false; context.current = n; context.render(n); context.screen = 'level'; context.startTimer(context.meta[n].time); }
  function click(parent, button) { context.$(parent).onclick({target:button}); }
  return {context, tick, enter, click};
}

test('the shipped game script parses', () => assert.doesNotThrow(() => new vm.Script(script)));

test('level 6 → 7 → 8 handlers, rewards, timer and hearts', () => {
  const {context:c,tick,enter,click} = harness();
  enter(6); tick(3200);
  for (const b of [...c.$('#forest').children].sort((a,b) => a.dataset.num - b.dataset.num)) click('#forest', b);
  tick(650); assert.equal(c.screen,'reward'); assert.equal(c.state.unlocked,7);
  enter(7); assert.equal(c.$('#timer').textContent,'01:30'); tick(1000); assert.equal(c.$('#timer').textContent,'01:29');
  const bubbles = c.$('#lagoon').children;
  assert.equal(bubbles.filter(b => b.dataset.kind === 'pearl').length,5);
  click('#lagoon', bubbles.find(b => b.dataset.kind === 'bubble')); assert.equal(c.state.hearts,2);
  const pearls = bubbles.filter(b => b.dataset.kind === 'pearl');
  click('#lagoon',pearls[0]); click('#lagoon',pearls[0]); assert.equal(c.$('#fb').textContent,'1 / 5 pearls collected');
  for (const b of pearls.slice(1)) click('#lagoon',b);
  const seconds = c.seconds; tick(650); assert.equal(c.screen,'reward'); tick(2000); assert.equal(c.seconds,seconds);
  assert.equal(c.state.unlocked,8); assert.equal(c.state.coins,290); assert.equal(c.state.stars,8);
  assert.equal(c.$('#rc').textContent,'+150'); assert.equal(c.$('#rewardNext').dataset.level,7);
  c.$('#rewardNext').onclick.call(c.$('#rewardNext')); assert.equal(c.screen,'map');
  enter(8);
  for (let round=0;round<4;round++) {
    tick(500); const target = c.$('#shields').children.find(b => b.classList.contains('glow')); assert.ok(target);
    tick(1100); click('#shields',target); if(round<3) tick(650);
  }
  tick(650); assert.equal(c.screen,'reward'); assert.equal(c.state.unlocked,9); assert.equal(c.state.coins,470);
  enter(7); for(const b of c.$('#lagoon').children.filter(b=>b.dataset.kind==='pearl')) click('#lagoon',b);
  tick(650); assert.equal(c.$('#rc').textContent,'Replay'); assert.equal(c.state.coins,470);
});

test('Lagoon timeout resets pearls; depleted hearts restore as before', () => {
  const {context:c,tick,enter,click} = harness(); enter(7);
  click('#lagoon',c.$('#lagoon').children.find(b=>b.dataset.kind==='pearl'));
  tick(90000); assert.equal(c.state.hearts,2); tick(900);
  assert.equal(c.$('#timer').textContent,'01:30'); assert.equal(c.$('#fb').textContent,'0 / 5 pearls collected');
  const bubble=c.$('#lagoon').children.find(b=>b.dataset.kind==='bubble'); click('#lagoon',bubble); assert.equal(c.state.hearts,1);
  click('#lagoon',bubble); assert.equal(c.state.hearts,3);
});



test('leaving a level cancels delayed feedback, timeout restarts and rewards', () => {
  const {context:c,tick,enter,click}=harness();
  enter(3); c.show('map'); enter(7); tick(2000);
  assert.equal(c.$('#fb').textContent,'0 / 5 pearls collected');
  tick(88000); c.show('map'); const remaining=c.seconds; tick(2000);
  assert.equal(c.screen,'map'); assert.equal(c.seconds,remaining);
  enter(7); for(const b of c.$('#lagoon').children.filter(b=>b.dataset.kind==='pearl'))click('#lagoon',b);
  c.show('map'); tick(1000); assert.equal(c.screen,'map'); assert.ok(!c.state.completed.includes(7));
});

test('pattern rounds ignore extra taps during success and retry delays',()=>{
  for(const n of [3,15]){
    const {context:c,tick,enter,click}=harness();c.Math=Object.create(Math);c.Math.random=()=>0;
    enter(n); tick(1800); const grid=n===3?'#runes':'#dreamHarmony';
    click(grid,c.$(grid).children[0]);click(grid,c.$(grid).children[1]);
    assert.equal(c.state.hearts,3);tick(2300);
    click(grid,c.$(grid).children[1]);const hearts=c.state.hearts;click(grid,c.$(grid).children[1]);
    assert.equal(c.state.hearts,hearts);
  }
});

test('remaining levels 9–15 complete, award once and follow chapter transitions',()=>{
  const {context:c,tick,enter,click}=harness();c.Math=Object.create(Math);c.Math.random=()=>0;
  for(let n=9;n<=15;n++){
    enter(n);
    if(n===9) for(const sym of c.$('#targetSeq').textContent.split(/\s+/))click('#skytemple',c.$('#skytemple').children.find(b=>b.dataset.sym===sym));
    if(n===10)for(const sym of ['🌿','🌊','🔥','⭐']){const b=new (c.$('#stage').constructor)();b.className='symbol';b.textContent=sym;click('#palette',b)}
    if(n===11)for(const b of c.$('#dreamGarden').children.filter(b=>b.dataset.kind==='butterfly'))click('#dreamGarden',b);
    if(n===12){const grid=c.$('#mirrorGrid');for(const sym of new Set(grid.children.map(b=>b.dataset.sym))){for(const b of grid.children.filter(b=>b.dataset.sym===sym))click('#mirrorGrid',b);tick(600)}}
    if(n===13){for(const word of ['moon','star','cloud'])click('#wordOrbs',c.$('#wordOrbs').children.find(b=>b.dataset.word===word));c.$('#checkWords').onclick()}
    if(n===14){for(let hit=0;hit<3;hit++){for(let t=0;t<4000;t+=16){tick(16);const angle=Number(c.$('#clockHand').style.transform?.match(/rotate\(([^d]+)/)?.[1]||0);if(Math.min(angle,360-angle)<=20)break}c.$('#stopClock').onclick()}}
    if(n===15){for(let round=1;round<=5;round++){tick(round===1?450:800);tick((round+1)*600);for(let i=0;i<round;i++)click('#dreamHarmony',c.$('#dreamHarmony').children[0])}}
    tick(650);assert.equal(c.screen,'reward','level '+n);assert.ok(c.state.completed.includes(n));
    const coins=c.state.coins;c.complete(n);tick(650);assert.equal(c.state.coins,coins);
    c.$('#rewardNext').onclick.call(c.$('#rewardNext'));assert.equal(c.screen,n===10?'dreamgate':n===15?'finale':'map');
  }
  assert.equal(c.state.hearts,3);
});
