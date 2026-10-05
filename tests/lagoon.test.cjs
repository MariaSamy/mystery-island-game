const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
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
    closest(selector) { return this.classList.contains(selector.slice(1)) ? this : null; }
    animate() {}
  }
  let time = 0, serial = 0;
  const jobs = new Map();
  function schedule(fn, delay, interval) { const id = ++serial; jobs.set(id, {fn, at: time + delay, interval}); return id; }
  const context = {
    $: selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); },
    document: {createElement: () => new Element()},
    intro: () => '', chime: () => {}, toast: () => {}, update: () => {}, celebrate: () => {}, recordHall: () => {},
    state: {hearts: 3, completed: [1,2,3,4,5], unlocked: 6, coins: 0, stars: 0, chapter: 2},
    meta: {6:{time:95,coins:140,stars:4,title:'Enchanted Forest'},7:{time:90,coins:150,stars:4,title:'Mermaid Lagoon'},8:{time:100,coins:180,stars:4,title:'Dragon Mountain'}},
    current: 6, seconds: 0, timerId: null,
    window: {}, show: screen => { context.screen = screen; },
    setTimeout: (fn, ms) => schedule(fn, ms, 0), setInterval: (fn, ms) => schedule(fn, ms, ms),
    clearInterval: id => jobs.delete(id), Math
  };
  vm.createContext(context);
  for (const name of ['startTimer','drawTimer','lose','forestTrail','lagoon','dragon','complete']) vm.runInContext(source(name), context);
  context.renderMap = () => {};
  vm.runInContext(script.slice(script.indexOf("$('#rewardNext').onclick="), script.indexOf("\n$('#enterDreamsBtn')")), context);
  context.render = n => ({6:context.forestTrail,7:context.lagoon,8:context.dragon}[n])();
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
  function enter(n) { context.current = n; context.render(n); context.screen = 'level'; context.startTimer(context.meta[n].time); }
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
