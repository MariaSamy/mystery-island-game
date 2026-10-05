const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function createGame(saved){
  class Element {
    constructor(tag='div'){this.tagName=tag;this.children=[];this.parentElement=null;this.attributes={};this.dataset={};this.style={setProperty(k,v){this[k]=v}};this.listeners={};this._text='';this.className='';this.hidden=false;
      this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:c=>{if(!this.classList.contains(c))this.className=(this.className+' '+c).trim()},remove:c=>{this.className=this.className.split(/\s+/).filter(x=>x!==c).join(' ')},toggle:(c,on)=>{if(on===undefined)on=!this.classList.contains(c);this.classList[on?'add':'remove'](c);return on}};
    }
    appendChild(e){e.parentElement=this;this.children.push(e);return e}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this)}
    setAttribute(k,v){v=String(v);this.attributes[k]=v;if(k==='class')this.className=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v}
    removeAttribute(k){delete this.attributes[k]}
    matches(selector){const attr=selector.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);if(attr){if(!(attr[1] in this.attributes)||attr[2]!==undefined&&this.attributes[attr[1]]!==attr[2])return false;selector=selector.replace(attr[0],'')}
      const id=selector.match(/#([\w-]+)/);if(id&&this.attributes.id!==id[1])return false;
      for(const c of selector.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(c[1]))return false;
      const tag=selector.match(/^[\w-]+/);return !tag||this.tagName===tag[0];
    }
    querySelectorAll(selector){const out=[];function walk(e){for(const c of e.children){if(c.matches(selector))out.push(c);walk(c)}}walk(this);return out}
    querySelector(s){return this.querySelectorAll(s)[0]||null}
    closest(s){return this.matches(s)?this:this.parentElement?.closest(s)||null}
    set textContent(v){this.children=[];this._text=String(v)}
    get textContent(){return this._text+this.children.map(e=>e.textContent).join('')}
    set innerHTML(v){this.children=[];this._text='';parse(String(v),this)}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
    click(){const e={target:this};for(let node=this;node;node=node.parentElement){node.onclick?.call(node,e);for(const fn of node.listeners.click||[])fn.call(node,e)}}
    animate(){} focus(){}
  }
  function parse(text,root){const stack=[root],voids=new Set(['meta','input','br','hr','link']);for(const token of text.matchAll(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)){const value=token[0];if(value.startsWith('<!--')||value.startsWith('<!'))continue;if(value.startsWith('</')){const tag=value.slice(2,-1).trim();for(let i=stack.length-1;i>0;i--)if(stack[i].tagName===tag){stack.length=i;break}continue}if(value.startsWith('<')){const tag=value.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const e=new Element(tag);for(const attr of value.matchAll(/([\w-]+)="([^"]*)"/g))e.setAttribute(attr[1],attr[2]);stack.at(-1).appendChild(e);if(!voids.has(tag)&&!value.endsWith('/>'))stack.push(e)}else{const e=new Element('#text');e._text=value.replace(/&amp;/g,'&');stack.at(-1).appendChild(e)}}}
  const root=new Element('document');parse(html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''),root);
  const document={querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s),createElement:t=>new Element(t),addEventListener(){},body:root.querySelector('body')};
  let time=0,serial=0;const jobs=new Map();function schedule(fn,ms,repeat,args=[]){const id=++serial;jobs.set(id,{fn:()=>fn(...args),at:time+ms,repeat});return id}
  const storage=new Map(saved?[['mysteryIslandV4',JSON.stringify(saved)]]:[]);
  const math=Object.create(Math);math.random=()=>.35;
  const window={scrollTo(){},innerWidth:390,innerHeight:844};
  const context={window,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Math:math,Date,Set,console,
    setTimeout:(fn,ms,...args)=>schedule(fn,ms,0,args),setInterval:(fn,ms)=>schedule(fn,ms,ms),clearTimeout:id=>jobs.delete(id),clearInterval:id=>jobs.delete(id),requestAnimationFrame:fn=>schedule(()=>fn(time),16,0),cancelAnimationFrame:id=>jobs.delete(id)};
  vm.createContext(context);
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\}\)\(\);\s*$/,`window.game={enter,renderMap,openCertificate,complete,healProgress,get state(){return state},get meta(){return meta},get seconds(){return seconds}};})();`);
  vm.runInContext(script,context);window.game.state.sound=false;
  function tick(ms){const end=time+ms;let count=0;for(;;){const due=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at);if(!due.length)break;if(++count>100000)throw Error('Scheduler loop');const [id,job]=due[0];time=job.at;if(job.repeat)job.at+=job.repeat;else jobs.delete(id);job.fn()}time=end}
  const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
  return {game:window.game,$,$$,tick,storage,screen:()=>$('.screen.active').attributes.id};
}
module.exports={createGame};
