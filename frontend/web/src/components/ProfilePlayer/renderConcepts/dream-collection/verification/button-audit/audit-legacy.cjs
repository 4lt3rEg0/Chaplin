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
 await page.route('**/api/v1/**',r=>{const u=r.request().url();if(u.includes('/theme'))return r.fulfill({json:{base_theme:'dark',player_skin_id:selected}});if(u.endsWith('/users/me'))return r.fulfill({json:{...user,preferences:JSON.stringify({base_theme:23,player_skin_id:selected,animated_background:'none'})}});if(u.includes('/profile-playback'))return r.fulfill({json:{mode:'all',tracks}});if(u.includes('/playlists/'))return r.fulfill({json:{id:8,tracks:u.includes('chaplin-radio')?[{...tracks[0],title:'Chaplin Radio'}]:tracks}});return r.fulfill({json:[]})});
 await page.route('**/dream-test/*.wav',r=>{const range=r.request().headers().range;if(range){const m=/bytes=(\d+)-(\d*)/.exec(range),a=+m[1],b=m[2]?Math.min(+m[2],wav.length-1):wav.length-1;return r.fulfill({status:206,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${a}-${b}/${wav.length}`},body:wav.subarray(a,b+1)})}return r.fulfill({contentType:'audio/wav',body:wav})});

 for(const id of ['aqua-flow','aero-amp','bubblegum-gloss']){
 selected=id;await page.goto('http://127.0.0.1:5173/profile');const p=page.locator('[data-profile-player]');await p.getByRole('button',{name:'Reproducir',exact:true}).waitFor();
 const state=()=>page.evaluate(()=>{const a=window.auditAudio.find(a=>a.src.includes('/dream-test/'));return a?{time:a.currentTime,volume:a.volume,paused:a.paused,src:a.src}:null});
 const click=(name)=>p.getByRole('button',{name,exact:true}).first().click();
 await click('Reproducir');await expect.poll(async()=>(await state())?.paused).toBe(false);await expect.poll(async()=>(await state())?.time).toBeGreaterThan(.2);
 await click('Pausar');await expect.poll(async()=>(await state())?.paused).toBe(true);
 for(const name of ['Siguiente','Anterior'])for(let i=0;i<await p.getByRole('button',{name,exact:true}).count();i++){await p.getByRole('button',{name,exact:true}).nth(i).click();await expect.poll(async()=>(await state())?.src).toContain(name==='Siguiente'?(i%2===0?'two.wav':'one.wav'):(i%2===0?(id==='bubblegum-gloss'?'two.wav':'one.wav'):'one.wav'));}
 const volume=p.getByRole('slider',{name:'Volumen',exact:true});await volume.click({position:{x:5,y:5}});await expect.poll(async()=>(await state()).volume).toBeLessThan(.15);
 if(id==='bubblegum-gloss'){
   await click('Volumen');await p.getByRole('slider',{name:'Nivel de volumen'}).fill('0.65');await expect.poll(async()=>(await state()).volume).toBe(.65);await click('Volumen');await expect(p.getByRole('slider',{name:'Nivel de volumen'})).toBeHidden();
   for(let i=0;i<await p.getByRole('button',{name:'Pausar',exact:true}).count();i++){await click('Reproducir');await p.getByRole('button',{name:'Pausar',exact:true}).nth(i).click();await expect.poll(async()=>(await state()).paused).toBe(true);}
 }else{
   const seek=p.getByRole('slider',{name:'Progreso'});const b=await seek.boundingBox();await seek.click({position:{x:b.width*.4,y:b.height/2}});await expect.poll(async()=>(await state()).time).toBeGreaterThan(3.8);
   await click('Favorito');await expect(p.getByRole('button',{name:'Favorito'})).toHaveAttribute('aria-pressed','true');await click('Favorito');await expect(p.getByRole('button',{name:'Favorito'})).toHaveAttribute('aria-pressed','false');
   await click('Ver lista');await click('Ocean Dreamer');await expect.poll(async()=>(await state()).src).toContain('two.wav');
   if(id==='aqua-flow'){await click('Visualizador');await expect(p.getByRole('button',{name:'Visualizador'})).toHaveAttribute('aria-pressed','false');await click('Visualizador');}
   else{await click('Silenciar');await expect.poll(async()=>(await state()).volume).toBe(0);await click('Activar sonido');await expect.poll(async()=>(await state()).volume).toBeGreaterThan(0);}
   await click('Detener reproducción del perfil');await expect.poll(async()=>(await state()).paused).toBe(true);await click('Escuchar la música de este perfil');await expect.poll(async()=>(await state()).paused).toBe(false);
 }
 reports.push({id,passed:true});console.log('PASS '+id);
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(output,'button-audit-legacy.json'),JSON.stringify({passed:true,reports},null,2));
 }catch(e){console.error(e);process.exitCode=1}finally{await browser.close()}})();
