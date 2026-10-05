const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createGame}=require('./game-harness.cjs');
const veteran={completed:Array.from({length:15},(_,i)=>i+1),unlocked:15,hearts:3,coins:2760,stars:67,sound:false,chapter:3,playerName:'Maria',dailyDate:'2026-10-04'};
function solve(h,n){
  const {$,$$,tick}=h;
  if(n===16){const beams=$$('.beam-turn');for(let i=0;i<3;i++)for(let turn=0;turn<[1,3,0][i];turn++)beams[i].click();$('#checkBeams').click()}
  if(n===17)for(let i=0;i<5;i++)$$('.aurora-star').find(b=>+b.dataset.i===i).click();
  if(n===18)for(const [round,weights] of [[1,2],[0,3],[2,3]].entries()){for(const i of weights)$$('.star-weight')[i].click();$('#checkScale').click();if(round<2)tick(650)}
  if(n===19)for(const i of [13,14,10,6,2,3])$$('.comet-tile')[i].click()
  if(n===20){for(const sym of ['🔭','🌈','⚖️','☄️','👑'])$$('.celestial-seal').find(b=>b.dataset.sym===sym).click();$('#checkSeals').click()}
}

test('fresh players cannot enter Chapter IV or level 16',()=>{
  const h=createGame();h.$$('.chapter-tab').find(b=>b.dataset.ch==='4').click();assert.equal(h.game.state.chapter,1);
  h.game.enter(16);assert.equal(h.screen(),'home');assert.equal(h.game.state.unlocked,1);assert.equal(h.$('#progressText').textContent,'0 / 20');
});

test('existing fifteen-level save unlocks Chapter IV without losing achievements or currency',()=>{
  const h=createGame(veteran);assert.equal(h.game.state.unlocked,16);assert.equal(h.game.state.coins,veteran.coins);assert.equal(h.game.state.stars,veteran.stars);assert.equal(h.game.state.playerName,'Maria');assert.equal(h.game.state.dailyDate,veteran.dailyDate);
  h.$$('.chapter-tab').find(b=>b.dataset.ch==='4').click();assert.equal(h.game.state.chapter,4);assert.equal(h.$('#chapterTitle').textContent,'The Celestial Isles');assert.deepEqual(h.$$('.node').map(b=>+b.dataset.level),[16,17,18,19,20]);assert.equal(h.$('#progressText').textContent,'15 / 20');
  h.game.openCertificate();assert.match(h.$('#certificateJourney').textContent,/first fifteen/);assert.equal(h.$('#certificateShards').textContent,'✦ 15 shards');
});

test('level 15 celebration offers Chapter IV and preserves its original certificate',()=>{
  const h=createGame({...veteran,completed:veteran.completed.slice(0,14)});h.game.enter(15);h.game.complete(15);h.tick(650);assert.equal(h.game.state.unlocked,16);h.$('#rewardNext').click();assert.equal(h.screen(),'finale');assert.equal(h.$('#enterCelestialBtn').hidden,false);h.$('#enterCelestialBtn').click();assert.equal(h.screen(),'map');assert.equal(h.game.state.chapter,4);h.game.openCertificate();assert.match(h.$('#certificateJourney').textContent,/Keeper of Dreams/);
});

test('all five new puzzles complete, rewards save once, and final certificate upgrades',()=>{
  const h=createGame(veteran);h.$$('.chapter-tab').find(b=>b.dataset.ch==='4').click();let expectedCoins=veteran.coins,expectedStars=veteran.stars;
  for(let n=16;n<=20;n++){
    h.game.enter(n);assert.equal(h.screen(),'level');assert.match(h.$('#levelTitle').textContent,new RegExp(h.game.meta[n].title));
    if(n===19)for(const i of [13,14,10,6,2,3])h.$$('.comet-tile')[i].click();else solve(h,n);
    h.tick(650);assert.equal(h.screen(),'reward','level '+n);assert.ok(h.game.state.completed.includes(n));expectedCoins+=h.game.meta[n].coins;expectedStars+=h.game.meta[n].stars;assert.equal(h.game.state.coins,expectedCoins);assert.equal(h.game.state.stars,expectedStars);assert.equal(h.game.state.unlocked,Math.min(20,n+1));
    h.game.complete(n);h.tick(650);assert.equal(h.game.state.coins,expectedCoins);h.$('#rewardNext').click();assert.equal(h.screen(),n===20?'finale':'map');
  }
  assert.equal(h.game.state.hearts,3);assert.equal(h.$('#progressText').textContent,'20 / 20');assert.equal(h.$('#enterCelestialBtn').hidden,true);assert.match(h.$('#finalTitle').textContent,/Celestial Guardian/);
  h.game.openCertificate();assert.match(h.$('#certificateJourney').textContent,/all twenty/);assert.equal(h.$('#certificateShards').textContent,'✦ 20 shards');
  const reloaded=createGame(JSON.parse(h.storage.get('mysteryIslandV4')));assert.equal(reloaded.game.state.completed.length,20);assert.equal(reloaded.game.state.unlocked,20);assert.equal(reloaded.game.state.coins,expectedCoins);
  h.game.enter(16);solve(h,16);h.tick(650);assert.equal(h.$('#rc').textContent,'Replay');assert.equal(h.game.state.coins,expectedCoins);
});

test('new puzzle mistakes, selection removal, incomplete checks and safe path rules',()=>{
  const h=createGame(veteran);h.game.enter(16);h.$('#checkBeams').click();assert.equal(h.game.state.hearts,2);
  h.game.state.hearts=3;h.game.state.unlocked=20;h.game.enter(17);h.$$('.aurora-star').find(b=>+b.dataset.i===3).click();assert.equal(h.game.state.hearts,2);assert.equal(h.$$('.aurora-star').filter(b=>b.classList.contains('selected')).length,0);
  h.game.enter(18);h.$$('.star-weight')[0].click();h.$$('.star-weight')[0].click();assert.match(h.$('#scaleSum').textContent,/0/);h.$('#checkScale').click();assert.equal(h.game.state.hearts,1);
  h.game.enter(19);h.$$('.comet-tile')[3].click();assert.equal(h.game.state.hearts,1);assert.equal(h.$$('.comet-tile').find(b=>b.classList.contains('current')).dataset.i,12);for(const i of [13,14,10,6,5])h.$$('.comet-tile')[i].click();assert.equal(h.game.state.hearts,3);h.$('#resetPath').click();assert.equal(h.$$('.comet-tile').find(b=>b.classList.contains('current')).dataset.i,12);
  h.game.enter(20);h.$('#checkSeals').click();assert.equal(h.game.state.hearts,3);for(const b of h.$$('.celestial-seal'))b.click();h.$('#checkSeals').click();assert.equal(h.game.state.hearts,2);assert.equal(h.$('#sanctuarySlots').textContent,'12345');solve(h,20);h.tick(650);assert.equal(h.screen(),'reward');
});

test('new-level timeout resets selections and leaving during a scales transition cancels it',()=>{
  const h=createGame(veteran);h.game.state.unlocked=20;h.game.enter(18);h.$$('.star-weight')[1].click();h.tick(130000);assert.equal(h.game.state.hearts,2);h.tick(900);assert.equal(h.$('#scaleSum').textContent,'Your weights: 0');assert.equal(h.$('#timer').textContent,'02:10');
  for(const i of [1,2])h.$$('.star-weight')[i].click();h.$('#checkScale').click();h.$('#backBtn').click();h.game.enter(17);h.tick(1000);assert.equal(h.$('#fb').textContent,'Begin with Red.');
});

test('a fresh player can travel through all twenty levels and four chapter maps',()=>{
  const h=createGame(),{$,$$,tick}=h;h.game.state.playerName='Explorer';$('#startBtn').click();$('#openMap').click();
  for(let n=1;n<=20;n++){
    assert.equal(h.game.state.unlocked,n);$$('.node').find(b=>+b.dataset.level===n).click();assert.equal(h.screen(),'level');
    if(n===1)$$('.answer').find(b=>b.dataset.a==='keyboard').click();
    if(n===2||n===12){const tiles=$$(n===2?'.card':'.mirror-tile');for(const sym of new Set(tiles.map(b=>b.dataset.sym))){for(const b of tiles.filter(b=>b.dataset.sym===sym))b.click();tick(n===2?650:600)}}
    if(n===3||n===15){const selector=n===3?'.rune':'#dreamHarmony';const buttons=n===3?$$(selector):$(selector).children;const rounds=n===3?4:5,interval=n===3?620:600;
      for(let round=1;round<=rounds;round++){tick(round===1?(n===3?500:450):(n===3?850:800));tick((round+1)*interval);for(let i=0;i<round;i++)buttons[n===3?1:2].click()}
    }
    if(n===4)for(const b of $$('.hidden'))b.click();
    if(n===5||n===10)for(const sym of n===5?['🌙','⭐','🔑']:['🌿','🌊','🔥','⭐'])$$('.symbol').find(b=>b.textContent===sym).click();
    if(n===6){const order=$$('.lantern').sort((a,b)=>a.dataset.num-b.dataset.num);tick(3200);for(const b of order)b.click()}
    if(n===7)for(const b of $$('.bubble').filter(b=>b.dataset.kind==='pearl'))b.click();
    if(n===8)for(let round=0;round<4;round++){tick(round===0?1600:2250);$$('.shield')[2].click()}
    if(n===9)for(const sym of $('#targetSeq').textContent.split(/\s+/))$$('.const-star').find(b=>b.dataset.sym===sym).click();
    if(n===11)for(const b of $$('.dream-item').filter(b=>b.dataset.kind==='butterfly'))b.click();
    if(n===13){for(const word of ['moon','star','cloud'])$$('.word-orb').find(b=>b.dataset.word===word).click();$('#checkWords').click()}
    if(n===14)for(let hit=0;hit<3;hit++){for(let t=0;t<4000;t+=16){tick(16);const angle=Number($('#clockHand').style.transform.match(/rotate\(([^d]+)/)[1]);if(Math.min(angle,360-angle)<=20)break}$('#stopClock').click()}
    if(n>=16)solve(h,n);
    tick(650);assert.equal(h.screen(),'reward','level '+n);$('#rewardNext').click();
    if(n===10)$('#enterDreamsBtn').click();if(n===15)$('#enterCelestialBtn').click();
    assert.equal(h.screen(),n===20?'finale':'map');
  }
  assert.equal(h.game.state.completed.length,20);assert.equal(h.game.state.hearts,3);assert.equal(h.game.state.coins,Object.values(h.game.meta).reduce((sum,m)=>sum+m.coins,0));assert.equal(h.game.state.stars,Object.values(h.game.meta).reduce((sum,m)=>sum+m.stars,0));
});
