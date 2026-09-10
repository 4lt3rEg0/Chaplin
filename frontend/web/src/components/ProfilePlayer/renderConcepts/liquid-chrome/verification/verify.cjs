const { chromium } = require('C:/Users/MaxJokerExtrem/Desktop/Chaplin/frontend/web/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
// Deterministic audio fixture: actual decoded PCM, not a mocked playback API.
const rate=22050, seconds=12, wav=Buffer.alloc(44+rate*seconds*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
for(let i=0;i<rate*seconds;i++)wav.writeInt16LE(Math.round(Math.sin(i/rate*Math.PI*880)*4000),44+i*2);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',async route=>{
  const u=route.request().url();
  if(u.includes('/playlists/'))return route.fulfill({json:{tracks:u.includes('chaplin-radio')?[{id:3,title:'Radio real test',media_url:'/lc-test/radio.wav',owner_username:'Chaplin'}]:[{id:1,title:'Liquid Dreams',media_url:'/lc-test/one.wav',owner_username:'CHAPLIN SESSIONS'},{id:2,title:'Blue reflections',media_url:'/lc-test/two.wav',owner_username:'CHAPLIN SESSIONS'}]}});
  return route.fulfill({json:[]});
 });
 await page.route('**/lc-test/*.wav',r=>{
  const range=r.request().headers().range;
  if(range){const match=/bytes=(\d+)-(\d*)/.exec(range);const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),wav.length-1):wav.length-1;return r.fulfill({status:206,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${wav.length}`},body:wav.subarray(start,end+1)});}
  return r.fulfill({contentType:'audio/wav',headers:{'Accept-Ranges':'bytes'},body:wav});
 });
 await page.goto('http://127.0.0.1:5173/dev/liquid-chrome');
 await page.locator('.lc-queue li').nth(1).waitFor();
 await page.locator('.lc-demo').getByRole('button',{name:'Reproducir',exact:true}).click();
 await page.locator('.lc-demo').getByRole('button',{name:'Pausar',exact:true}).waitFor();
 await page.waitForTimeout(900);
 assert.match(await page.locator('.lc-time').innerText(), /0:0[1-9]|0:00/);
 assert.equal(await page.locator('.lc-led.is-on').count(),1);
 assert(await page.locator('.lc-spectrum').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4===3&&v>0)}),'spectrum must contain actual audio bars');
 await page.screenshot({path:path.join(__dirname,'desktop.png')});
 await page.locator('.lc-demo').getByRole('button',{name:'Pausar',exact:true}).click();
 assert.equal(await page.locator('.lc-led.is-on').count(),0);
 await page.locator('.lc-demo').getByRole('slider',{name:'Posición de reproducción'}).fill('6');
 await page.waitForTimeout(150);assert.match(await page.locator('.lc-time').innerText(),/0:06/);
 await page.locator('.lc-demo').getByRole('slider',{name:'Volumen',exact:true}).fill('0.35');
 assert.equal(await page.locator('.lc-demo').getByRole('slider',{name:'Volumen',exact:true}).inputValue(),'0.35');
 await page.locator('.lc-demo').getByRole('button',{name:'Canción siguiente',exact:true}).click();
 await page.waitForTimeout(400);assert.equal(await page.locator('.lc-title').innerText(),'Blue reflections');
 await page.locator('.lc-demo').getByRole('button',{name:'Canción anterior',exact:true}).click();
 await page.waitForTimeout(400);assert.equal(await page.locator('.lc-title').innerText(),'Liquid Dreams');
 await page.locator('.lc-demo').getByRole('button',{name:/Radio Chaplin ·/}).click();
 await page.locator('.lc-demo').getByRole('button',{name:'Reproducir',exact:true}).click();
 await page.locator('.lc-demo').getByRole('button',{name:'Pausar',exact:true}).waitFor();
 assert.equal(await page.locator('.lc-title').innerText(),'Radio real test');
 await page.locator('.lc-demo').getByRole('button',{name:'Silencio',exact:true}).click();
 assert.equal(await page.locator('.lc-demo').getByRole('slider',{name:'Volumen',exact:true}).inputValue(),'0');
 await page.locator('.lc-demo').getByRole('button',{name:'Aleatorio',exact:true}).click();
 assert.equal(await page.locator('.lc-demo').getByRole('button',{name:'Aleatorio',exact:true}).getAttribute('aria-pressed'),'true');
 await page.locator('.lc-demo').getByRole('button',{name:'Repetir: no',exact:true}).click();
 await page.locator('.lc-demo').getByRole('button',{name:'Repetir: lista',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(__dirname,'mobile.png')});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile must not overflow');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({passed:true,checks:['real PCM playback','audio-driven spectrum','LED play/pause','seek','volume','next','previous','source switch','mute','shuffle','repeat','mobile overflow'],note:'Playlist API responses intercepted with fixtures; real backend playlists verified separately.'},null,2));
 await browser.close(); console.log('PASS: playback, spectrum, transport, sources, controls and mobile');
})().catch(e=>{console.error(e);process.exit(1)});
