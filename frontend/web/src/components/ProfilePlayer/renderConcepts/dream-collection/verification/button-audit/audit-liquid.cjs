const {chromium,expect}=require('C:/Users/MaxJokerExtrem/Desktop/Chaplin/frontend/web/node_modules/@playwright/test');
const fs=require('fs'),path=require('path');
const jobs=JSON.parse(fs.readFileSync(path.join(__dirname,'jobs.json'),'utf8').replace(/^\uFEFF/,''));
const output=path.join(__dirname,'verification');fs.mkdirSync(output,{recursive:true});
const rate=22050,secs=10,wav=Buffer.alloc(44+rate*secs*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<rate*secs;i++)wav.writeInt16LE(Math.round((Math.sin(i/rate*Math.PI*880)+Math.sin(i/rate*Math.PI*2200)) *3000),44+i*2);
const user={id:98765,username:'dream_fixture',display_name:'Dream Artist',profile_public:true,profile_playback_mode:'all'};
const tracks=[{id:1,title:'Moonlit Tides',media_url:'/dream-test/one.wav',owner_username:'Dream Artist'},{id:2,title:'Ocean Dreamer',media_url:'/dream-test/two.wav',owner_username:'Dream Artist'}];
let selected=jobs[0].id;
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const reports=[],errors=[];try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.addInitScript(()=>{localStorage.setItem('token','isolated-fixture-only');window.auditAudio=[];const NativeAudio=window.Audio;window.Audio=new Proxy(NativeAudio,{construct(target,args){const a=new target(...args);window.auditAudio.push(a);return a}})});
 await page.route('**/api/v1/**',r=>{const u=r.request().url();if(u.includes('/theme'))return r.fulfill({json:{base_theme:'dark',player_skin_id:selected}});if(u.endsWith('/users/me'))return r.fulfill({json:{...user,preferences:JSON.stringify({base_theme:23,player_skin_id:selected,animated_background:'none'})}});if(u.includes('/playlists/'))return r.fulfill({json:{id:8,tracks:u.includes('chaplin-radio')?[{...tracks[0],title:'Chaplin Radio'}]:tracks}});return r.fulfill({json:[]})});
 await page.route('**/dream-test/*.wav',r=>{const range=r.request().headers().range;if(range){const m=/bytes=(\d+)-(\d*)/.exec(range),a=+m[1],b=m[2]?Math.min(+m[2],wav.length-1):wav.length-1;return r.fulfill({status:206,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${a}-${b}/${wav.length}`},body:wav.subarray(a,b+1)})}return r.fulfill({contentType:'audio/wav',body:wav})});
 for(const j of [{id:'liquid-chrome'}]){
  selected=j.id;await page.goto('http://127.0.0.1:5173/profile');
  const player=page.locator('[data-liquid-chrome]');await player.waitFor();const seek=player.getByRole('slider',{name:'Posición de reproducción'});
  await expect(seek).toBeEnabled();await seek.fill('3');await expect(player.locator('.lc-time')).toHaveText('0:03 / 0:10');
  await player.getByRole('button',{name:'Reproducir',exact:true}).click();await expect(player.getByRole('button',{name:'Pausar',exact:true})).toBeVisible();await page.waitForTimeout(450);await expect(player.locator('.lc-led')).toHaveClass(/is-on/);
  const spectrum=await player.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0));if(!spectrum)throw Error(j.id+' spectrum is empty');
  await player.screenshot({path:path.join(output,j.id+'.png')});
  await player.getByRole('button',{name:'Pausar',exact:true}).click();await expect(player.locator('.lc-led')).not.toHaveClass(/is-on/);
  await seek.fill('6');await expect(player.locator('.lc-time')).toHaveText('0:06 / 0:10');
  await player.getByRole('slider',{name:'Volumen',exact:true}).fill('0.3');await expect(player.getByRole('slider',{name:'Volumen',exact:true})).toHaveValue('0.3');
  await player.getByRole('button',{name:'Canción siguiente'}).click();await expect(player.locator('.lc-title')).toHaveText('Ocean Dreamer');
  await player.getByRole('button',{name:'Canción anterior'}).click();await expect(player.locator('.lc-title')).toHaveText('Moonlit Tides');
  for(const label of ['Orden normal','Repetir canción','Repetir lista','Aleatorio'])await player.getByRole('button',{name:'Modo de reproducción: '+label,exact:true}).click();
  await expect(player.getByRole('button',{name:'Modo de reproducción: Orden normal',exact:true})).toBeVisible();
  if(j.id==='dream-aquarium-mini'||j.id==='cupid-crystal-deck'){await page.setViewportSize({width:390,height:844});await player.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,j.id+'-mobile.png')});await page.setViewportSize({width:1440,height:1100})}
  const audioState=()=>page.evaluate(()=>{const a=window.auditAudio.find(a=>a.src.includes('/dream-test/'));return {time:a.currentTime,volume:a.volume,paused:a.paused,ended:a.ended,src:a.src}});
  await player.getByRole('slider',{name:'Volumen',exact:true}).fill('0');await expect.poll(async()=>(await audioState()).volume).toBe(0);
  await player.getByRole('slider',{name:'Volumen',exact:true}).fill('1');await expect.poll(async()=>(await audioState()).volume).toBe(1);
  await player.getByRole('slider',{name:'Volumen',exact:true}).fill('0.25');await expect.poll(async()=>(await audioState()).volume).toBe(.25);
  const pause=player.getByRole('button',{name:'Pausar',exact:true});if(await pause.count())await pause.click();
  await expect.poll(async()=>(await audioState()).paused).toBe(true);
  await seek.fill('4');await expect.poll(async()=>(await audioState()).time).toBeCloseTo(4,0);
  await player.getByRole('button',{name:'Reproducir',exact:true}).click();await expect.poll(async()=>(await audioState()).time).toBeGreaterThan(4.1);
  await player.getByRole('button',{name:'Modo de reproducción: Orden normal',exact:true}).click();
  await seek.fill('9.6');await expect.poll(async()=>(await audioState()).time,{timeout:5000}).toBeLessThan(2);await expect(player.locator('.lc-title')).toHaveText('Moonlit Tides');await expect.poll(async()=>(await audioState()).paused).toBe(false);
  await player.getByRole('button',{name:'Modo de reproducción: Repetir canción',exact:true}).click();
  await player.getByRole('button',{name:'Canción siguiente'}).click();await expect(player.locator('.lc-title')).toHaveText('Ocean Dreamer');await expect(seek).toBeEnabled();await seek.fill('9.6');await expect(player.locator('.lc-title')).toHaveText('Moonlit Tides',{timeout:5000});
  await player.getByRole('button',{name:'Modo de reproducción: Repetir lista',exact:true}).click();await expect(seek).toBeEnabled();await seek.fill('9.6');await expect(player.locator('.lc-title')).toHaveText('Ocean Dreamer',{timeout:5000});
  await player.getByRole('button',{name:'Modo de reproducción: Aleatorio',exact:true}).click();await expect(seek).toBeEnabled();await seek.fill('9.6');await expect(player.getByRole('button',{name:'Reproducir',exact:true})).toBeVisible({timeout:5000});await expect.poll(async()=>(await audioState()).ended).toBe(true);
  reports.push({id:j.id,passed:true,spectrum:true,actualAudioVolume:true,actualAudioSeek:true,naturalRepeatOne:true,naturalRepeatList:true,naturalShuffle:true,orderedStop:true});console.log('PASS '+j.id);
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(output,'button-audit-liquid.json'),JSON.stringify({passed:true,skins:reports,scope:"First player only; awaiting user review",note:'Isolated API/auth fixtures. Real HTMLAudioElement and Web Audio decode PCM; user account not accessed.'},null,2));
}catch(e){console.error(e);process.exitCode=1}finally{await browser.close()}})();




