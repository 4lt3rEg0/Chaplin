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
 await page.addInitScript(()=>localStorage.setItem('token','isolated-fixture-only'));
 await page.route('**/api/v1/**',r=>{const u=r.request().url();if(u.includes('/theme'))return r.fulfill({json:{base_theme:'dark',player_skin_id:selected}});if(u.endsWith('/users/me'))return r.fulfill({json:{...user,preferences:JSON.stringify({base_theme:23,player_skin_id:selected,animated_background:'none'})}});if(u.includes('/playlists/'))return r.fulfill({json:{id:8,tracks:u.includes('chaplin-radio')?[{...tracks[0],title:'Chaplin Radio'}]:tracks}});return r.fulfill({json:[]})});
 await page.route('**/dream-test/*.wav',r=>{const range=r.request().headers().range;if(range){const m=/bytes=(\d+)-(\d*)/.exec(range),a=+m[1],b=m[2]?Math.min(+m[2],wav.length-1):wav.length-1;return r.fulfill({status:206,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${a}-${b}/${wav.length}`},body:wav.subarray(a,b+1)})}return r.fulfill({contentType:'audio/wav',body:wav})});
 for(const j of jobs){
  selected=j.id;await page.goto('http://127.0.0.1:5173/profile');
  const player=page.locator(`[data-dream-skin="${j.id}"]`);await player.waitFor();const seek=player.getByRole('slider',{name:'Posición de reproducción'});
  await expect(seek).toBeEnabled();await seek.fill('3');await expect(player.locator('.dc-time')).toHaveText('0:03 / 0:10');
  await player.getByRole('button',{name:'Reproducir',exact:true}).click();await expect(player.getByRole('button',{name:'Pausar',exact:true})).toBeVisible();await page.waitForTimeout(450);await expect(player.locator('.dc-led')).toHaveClass(/on/);
  const spectrum=await player.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0));if(!spectrum)throw Error(j.id+' spectrum is empty');
  await player.screenshot({path:path.join(output,j.id+'.png')});
  await player.getByRole('button',{name:'Pausar',exact:true}).click();await expect(player.locator('.dc-led')).not.toHaveClass(/on/);
  await seek.fill('6');await expect(player.locator('.dc-time')).toHaveText('0:06 / 0:10');
  await player.getByRole('slider',{name:'Volumen',exact:true}).fill('0.3');await expect(player.getByRole('slider',{name:'Volumen',exact:true})).toHaveValue('0.3');
  await player.getByRole('button',{name:'Canción siguiente'}).click();await expect(player.locator('.dc-title')).toHaveText('Ocean Dreamer');
  await player.getByRole('button',{name:'Canción anterior'}).click();await expect(player.locator('.dc-title')).toHaveText('Moonlit Tides');
  for(const label of ['Orden normal','Repetir canción','Repetir lista','Aleatorio'])await player.getByRole('button',{name:'Modo de reproducción: '+label,exact:true}).click();
  await expect(player.getByRole('button',{name:'Modo de reproducción: Orden normal',exact:true})).toBeVisible();
  if(j.id==='dream-aquarium-mini'||j.id==='cupid-crystal-deck'){await page.setViewportSize({width:390,height:844});await player.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,j.id+'-mobile.png')});await page.setViewportSize({width:1440,height:1100})}
  reports.push({id:j.id,passed:true,spectrum:true});console.log('PASS '+j.id);
 }
 await page.goto('http://127.0.0.1:5173/settings');for(const j of jobs)await expect(page.getByRole('button',{name:'Ir a '+j.name,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ir a Dream Aquarium Mini',exact:true}).click();await page.locator('[data-dream-skin="dream-aquarium-mini"]').first().getByRole('button',{name:'Reproducir',exact:true}).click();await expect(page.locator('[data-dream-skin="dream-aquarium-mini"]').first().getByRole('button',{name:'Pausar',exact:true})).toBeVisible();
 user.profile_playback_mode='radio';selected='dream-aquarium-mini';await page.goto('http://127.0.0.1:5173/profile');const aquarium=page.locator('[data-dream-skin="dream-aquarium-mini"]').first();await expect(aquarium.locator('.dc-title')).toHaveText('Chaplin Radio');await aquarium.getByRole('button',{name:'Reproducir',exact:true}).click();await expect(aquarium.getByRole('button',{name:'Pausar',exact:true})).toBeVisible();
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,skins:reports,settingsCatalog:12,liveSettingsPreview:true,radio:true,note:'Isolated API/auth fixtures. Real HTMLAudioElement and Web Audio decode PCM; user account not accessed.'},null,2));
}catch(e){console.error(e);process.exitCode=1}finally{await browser.close()}})();




