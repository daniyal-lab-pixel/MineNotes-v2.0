import { test, expect, type Page } from '@playwright/test';

test.use({hasTouch:true,isMobile:true,viewport:{width:393,height:852}});

const dimensions = [[320,568],[375,667],[390,844],[393,852],[430,932],[768,1024],[1366,768],[1920,1080]];
const testMenu = '/?testMode=true&screen=menu';

async function ready(page: Page) {
  await page.goto(testMenu);
  await expect(page.getByRole('button', {name:'New Note',exact:true})).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function readNotes(page: Page) {
  return page.evaluate(() => new Promise<any[]>((resolve,reject) => {
    const request = indexedDB.open('MineNotesTestDB');
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction('notes').objectStore('notes').getAll();
      read.onsuccess = () => { resolve(read.result); db.close(); };
      read.onerror = () => reject(read.error);
    };
    request.onerror = () => reject(request.error);
  }));
}
async function expectSaved(page: Page) {
  await expect(page.getByRole('status').filter({hasText:'Saved'})).toBeVisible();
}
async function seedBook(page: Page, pages: string[]) {
  await page.evaluate(async (pages) => {
    await new Promise<void>((resolve,reject) => {
      const req = indexedDB.open('MineNotesTestDB');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['notes','bookMetadata','bookshelves','customSongs','customPlaylists'],'readwrite');
        tx.objectStore('notes').put({ id:'responsive-fixture', title:'A very long expedition journal title that must remain readable', content:JSON.stringify({format:'MineNotes_Book',version:1,pages}), plainText:'Expedition journal', pageCount:pages.length, wordCount:8, createdAt:1, updatedAt:1, schemaVersion:1, isTestFixture:true });
        tx.objectStore('bookshelves').put({id:'expeditions',name:'Expeditions',createdAt:1,updatedAt:1});
        tx.objectStore('bookMetadata').put({noteId:'responsive-fixture',coverId:'enchanted',titleColor:'#fed83d',shelfId:'expeditions',isFavorite:true});
        tx.objectStore('customSongs').put({id:'custom-song',videoId:'dQw4w9WgXcQ',title:'Custom song fixture',sourceUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',discColor:'#fed83d',createdAt:1,updatedAt:1});
        tx.objectStore('customPlaylists').put({id:'custom-playlist',playlistId:'PL123456789012345',title:'Custom playlist fixture',sourceUrl:'https://www.youtube.com/playlist?list=PL123456789012345',discColor:'#fed83d',createdAt:1,updatedAt:1});
        tx.oncomplete = () => {db.close();resolve();}; tx.onerror = () => reject(tx.error);
      }; req.onerror = () => reject(req.error);
    });
  }, pages);
}
// Deterministic YouTube API fixture: playback assertions here exercise event wiring,
// player identity and navigation, not live YouTube streaming or permission policies.
async function fakeYouTube(page: Page) {
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({contentType:'application/javascript',body:`
    window.__ytCreated=0; window.__ytDestroyed=0;
    window.YT={Player:class {
      constructor(id,options) {
        this.options=options; this.frame=document.createElement('iframe'); this.frame.id=id;
        this.frame.title='YouTube API test fixture'; this.frame.style.cssText='width:100%;height:100%;border:0';
        document.getElementById(id).replaceWith(this.frame); window.__ytCreated++;
        setTimeout(()=>options.events.onReady({target:this}),10);
      }
      setVolume(){} mute(){} unMute(){} setLoop(){} setShuffle(){}
      playVideo(){setTimeout(()=>this.options.events.onStateChange({data:1}),10);}
      pauseVideo(){setTimeout(()=>this.options.events.onStateChange({data:2}),10);}
      loadVideoById(){this.playVideo();} cueVideoById(){} getPlaylistIndex(){return 0;}
      loadPlaylist(){this.playVideo();} cuePlaylist(){} stopVideo(){this.pauseVideo();}
      destroy(){this.frame.remove();window.__ytDestroyed++;}
    }};
    window.onYouTubeIframeAPIReady?.();
  `}));
}
async function assertNoOverflow(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

for (const [width,height] of dimensions) {
  test.describe(`${width} x ${height}`, () => {
    test.use({viewport:{width,height},isMobile:width<=768,hasTouch:width<=768});
    test('menu, typing, Jukebox return, shelf, reload, settings and history', async ({page}, info) => {
      const errors: string[]=[]; page.on('pageerror', e => errors.push(e.message));
      await fakeYouTube(page);
      await ready(page);
      await assertNoOverflow(page,width);
      if (width<=900) {
        const logo = page.getByRole('img',{name:'MineNotes — Crafted by Daniyal!'});
        const bounds=await logo.boundingBox();
        expect(bounds).not.toBeNull(); expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
      }
      await page.screenshot({path:`validation/menu-${width}x${height}.png`});
      for (const name of ['New Note','Saved Notes','History','Settings']) {
        const bounds=await page.getByRole('button',{name,exact:true}).boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height);
      }
      await page.getByRole('button',{name:'New Note',exact:true}).click();
      const editor=page.getByRole('textbox',{name:'Book page text',exact:true});
      await expect(editor).toHaveAttribute('contenteditable','true');
      for (const button of await page.getByTestId('editor-toolbar').getByRole('button').all()) {
        const bounds = await button.boundingBox();
        if (bounds) { expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width); }
      }
      await editor.click(); await page.keyboard.type(`Expedition ${width}. Diamonds found!`);
      await expect(editor).toContainText(`Expedition ${width}. Diamonds found!`);
      await expectSaved(page);
      expect(JSON.parse((await readNotes(page))[0].content).pages).toHaveLength(1);
      await page.getByRole('button',{name:'Toggle Music Discs Jukebox'}).click();
      await expect(page.getByRole('dialog',{name:'MineNotes Jukebox'})).toBeVisible();
      await expect(page.locator('iframe')).toHaveCount(1);
      const playerBounds = await page.locator('iframe').boundingBox();
      expect(playerBounds!.width).toBeGreaterThanOrEqual(200);
      expect(playerBounds!.height).toBeGreaterThanOrEqual(200);
      await page.getByRole('button',{name:'Play',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).jukeboxController.getState().status)).toBe('playing');
      if (width<=900) {
        const bounds=await page.getByRole('dialog',{name:'MineNotes Jukebox'}).boundingBox();
        expect(bounds!.x).toBe(0); expect(bounds!.width).toBe(width);
        await page.screenshot({path:`validation/jukebox-${width}x${height}.png`});
        await page.getByRole('button',{name:'Back to Book',exact:true}).click();
        await expect(page.locator('iframe')).toHaveCount(0);
        await expect.poll(()=>page.evaluate(()=>(window as any).jukeboxController.getState().status)).toBe('paused');
      } else {
        await page.getByRole('button',{name:'Minimize Jukebox',exact:true}).click();
        await expect(page.locator('iframe')).toHaveCount(1);
        await page.getByRole('button',{name:'Expand Jukebox',exact:true}).click();
        expect(await page.evaluate(()=>(window as any).__ytCreated)).toBe(1);
        await page.getByRole('button',{name:'Close Jukebox',exact:true}).click();
      }
      await expect(editor).toContainText(`Expedition ${width}. Diamonds found!`);
      await page.screenshot({path:`validation/editor-${width}x${height}.png`});
      await page.getByRole('button',{name:'Done',exact:true}).click();
      await expect(page.getByRole('heading',{name:'My Bookshelf'})).toBeVisible();
      await assertNoOverflow(page,width);
      await page.screenshot({path:`validation/bookshelf-${width}x${height}.png`});
      await page.getByRole('textbox',{name:'Search books by title'}).fill('not-present');
      await expect(page.getByText('No matching books found.')).toBeVisible();
      await page.getByRole('button',{name:'Clear Search',exact:true}).last().click();
      const book=page.getByRole('button',{name:/Book: Expedition/}).first();
      if (width<=768) await book.click(); else await book.dblclick();
      await expect(editor).toContainText(`Expedition ${width}. Diamonds found!`);
      await page.reload();
      await expect(page.getByRole('button',{name:'Saved Notes',exact:true})).toBeVisible();
      expect((await readNotes(page))[0].plainText).toContain(`Expedition ${width}. Diamonds found!`);
      await page.getByRole('button',{name:'History',exact:true}).click();
      await expect(page.getByText(/Expedition/, {exact:false}).first()).toBeVisible();
      await page.getByRole('button',{name:'Done',exact:true}).click();
      await page.getByRole('button',{name:'Settings',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Game Settings'})).toBeVisible();
      await assertNoOverflow(page,width);
      expect(await page.evaluate(async()=>(await indexedDB.databases()).some(db=>db.name==='MineNotesDB'))).toBe(false);
      expect(errors).toEqual([]);
      await info.attach('Viewport verification',{body:JSON.stringify({width,height,errors}),contentType:'application/json'});
    });
  });
}

test('active facing page and formatting survive desktop/phone switches', async ({page}) => {
  await page.setViewportSize({width:1366,height:768});
  await ready(page);
  await seedBook(page,['<p><strong>First page</strong></p>','<p style="text-align: center;"><em>Facing page</em></p>','<p>Third page</p>']);
  await page.goto('/?testMode=true&screen=editor&noteId=responsive-fixture');
  await page.getByRole('button',{name:'Toggle Reading Mode'}).click();
  await expect(page.getByRole('textbox',{name:'Facing book page text',exact:true})).toBeVisible();
  const right=page.getByRole('textbox',{name:'Facing book page text',exact:true});
  await right.click(); await right.press('End'); await page.keyboard.type(' treasure');
  await expectSaved(page);
  const before=(await readNotes(page))[0].content;
  await page.setViewportSize({width:375,height:667});
  await expect(page.getByRole('textbox',{name:'Book page text',exact:true})).toContainText('Facing page treasure');
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(1);
  expect((await readNotes(page))[0].content).toBe(before);
  await page.setViewportSize({width:1366,height:768});
  await expect(right).toContainText('Facing page treasure');
  await page.screenshot({path:'validation/editor-double-desktop.png'});
  await page.getByRole('button',{name:'Done',exact:true}).click();
  expect(JSON.parse((await readNotes(page))[0].content).pages).toHaveLength(3);
});

test('small-phone formatting, pagination, PDF, backup and restore preserve content', async ({page}) => {
  await page.setViewportSize({width:320,height:568});
  await ready(page);
  await page.getByRole('button',{name:'New Note',exact:true}).click();
  const editor=page.getByRole('textbox',{name:'Book page text',exact:true});
  await expect(editor).toHaveAttribute('contenteditable','true');
  await editor.fill('Diamond journal');
  await editor.press('ControlOrMeta+A');
  await page.getByRole('button',{name:'Open Formatting Palette (Alt+Q)'}).click();
  await page.getByTitle('Bold (Ctrl+B)',{exact:true}).click();
  await page.getByTitle('Align Center',{exact:true}).click();
  await page.getByRole('button',{name:'Close Formatting',exact:true}).click();
  await expect(editor.locator('strong')).toContainText('Diamond journal');
  await expect(editor.locator('p')).toHaveCSS('text-align','center');
  await editor.press('ControlOrMeta+End');
  const longText=' '+Array.from({length:220},(_,i)=>`ore${i}`).join(' ');
  await page.keyboard.insertText(longText);
  await expectSaved(page);
  const notes=await readNotes(page);
  const book=notes[0]; const pages=JSON.parse(book.content).pages;
  expect(pages.length).toBeGreaterThan(1);
  const text=await page.evaluate(pages=>pages.map((p:string)=>{const el=document.createElement('div');el.innerHTML=p;return el.textContent;}).join(''),pages);
  expect(text.replace(/\s/g,'')).toBe(('Diamond journal'+longText).replace(/\s/g,''));
  await page.getByLabel('Book actions',{exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download Book as PDF',exact:true}).click();
  const pdf=await downloadPromise; await pdf.saveAs('validation/mobile-export.pdf');
  expect(await pdf.failure()).toBeNull();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const backupPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:/Export Backup/}).click();
  const backup=await backupPromise; await backup.saveAs('validation/mobile-backup.json');
  await page.locator('input[type=file]').setInputFiles('validation/mobile-backup.json');
  await page.getByRole('button',{name:/Restore|Merge/}).last().click();
  await expect.poll(async()=>(await readNotes(page))[0].content).toBe(book.content);
});

test('installed service worker supports an offline reload and editing', async ({page,context}) => {
  await ready(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload(); await expect(page.getByRole('button',{name:'New Note',exact:true})).toBeVisible();
  await seedBook(page,['<p>Offline expedition</p>']);
  await page.goto('/?testMode=true&screen=editor&noteId=responsive-fixture');
  await expect(page.getByRole('textbox',{name:'Book page text',exact:true})).toContainText('Offline expedition');
  await context.setOffline(true);
  await page.reload();
  const editor=page.getByRole('textbox',{name:'Book page text',exact:true});
  await expect(editor).toContainText('Offline expedition');
  await editor.fill('Offline expedition continued');
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.getByRole('heading',{name:'My Bookshelf'})).toBeVisible();
  expect((await readNotes(page))[0].plainText).toBe('Offline expedition continued');
  await context.setOffline(false);
});

test('mobile book actions preserve covers, favorites, shelves and custom music', async ({page}) => {
  await page.setViewportSize({width:375,height:667});
  await fakeYouTube(page); await ready(page); await seedBook(page,['<p>Treasure survives</p>']);
  await page.getByRole('button',{name:'Saved Notes',exact:true}).click();
  await page.getByRole('button',{name:'Book Options',exact:true}).click();
  await page.getByRole('menuitem',{name:'Change Cover',exact:true}).click();
  await page.getByRole('button',{name:'Golden',exact:true}).click();
  await page.getByRole('button',{name:'Apply Cover',exact:true}).click();
  await page.getByRole('button',{name:'Book Options',exact:true}).click();
  await page.getByRole('menuitem',{name:/Remove Favorite/}).click();
  await page.getByRole('button',{name:'Manage Shelves',exact:true}).last().click();
  await expect(page.getByRole('dialog',{name:'Manage Shelves'})).toBeVisible();
  await page.getByRole('button',{name:'Rename Expeditions',exact:true}).click();
  await page.getByRole('textbox').last().fill('Nether trips');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('dialog',{name:'Manage Shelves'}).getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:/Book: A very long expedition/}).click();
  await page.getByLabel('Book actions',{exact:true}).click();
  await page.getByRole('button',{name:'Toggle Environment Atmosphere'}).click();
  for (const name of ['Rain Ambience','Snow Biome','Night Sky','Clear / Day']) {
    await page.getByRole('button',{name,exact:true}).click();

  }
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Toggle Music Discs Jukebox'}).click();
  await page.getByRole('button',{name:/My Music/}).click();
  await expect(page.getByText('Custom song fixture',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/My Playlists/}).click();
  await expect(page.getByText('Custom playlist fixture',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Back to Book',exact:true}).click();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  const values=await page.evaluate(()=>new Promise<any>(resolve=>{
    const req=indexedDB.open('MineNotesTestDB'); req.onsuccess=()=>{
      const db=req.result;const tx=db.transaction(['bookMetadata','bookshelves','customSongs','customPlaylists']);
      const result:any={};for(const key of ['bookMetadata','bookshelves','customSongs','customPlaylists']) {
        const read=tx.objectStore(key).getAll();read.onsuccess=()=>result[key]=read.result;
      } tx.oncomplete=()=>{db.close();resolve(result);};
    };
  }));
  expect(values.bookMetadata[0]).toMatchObject({coverId:'golden',isFavorite:false,shelfId:'expeditions'});
  expect(values.bookshelves[0].name).toBe('Nether trips');
  expect(values.customSongs).toHaveLength(1);expect(values.customPlaylists).toHaveLength(1);
  expect(JSON.parse((await readNotes(page))[0].content).pages).toEqual(['<p>Treasure survives</p>']);
});

test('short landscape and keyboard-sized viewport keep writing and Done reachable', async ({page}) => {
  await page.setViewportSize({width:844,height:390}); await ready(page);
  await page.getByRole('button',{name:'New Note',exact:true}).click();
  let editor=page.getByRole('textbox',{name:'Book page text',exact:true});
  await expect(editor).toHaveAttribute('contenteditable','true');
  await editor.fill('Landscape writing');
  await page.setViewportSize({width:393,height:340});
  await editor.press('End'); await page.keyboard.type(' with keyboard');
  await expectSaved(page);
  await expect(page.getByRole('button',{name:'Done',exact:true})).toBeInViewport();
  await expect(page.locator('[class*="mobilePageIndicator"]')).toBeInViewport();
  await page.screenshot({path:'validation/editor-keyboard-sized.png'});
  await page.setViewportSize({width:393,height:852});
  await expect(editor).toContainText('Landscape writing with keyboard');
  await page.getByRole('button',{name:'Done',exact:true}).click();
  expect((await readNotes(page))[0].plainText).toBe('Landscape writing with keyboard');
});

test('a failed save stays in the editor and can be retried', async ({page}) => {
  await ready(page);
  await page.getByRole('button',{name:'New Note',exact:true}).click();
  const editor=page.getByRole('textbox',{name:'Book page text',exact:true});
  await expect(editor).toHaveAttribute('contenteditable','true');
  await page.evaluate(()=>{
    const original=IDBObjectStore.prototype.put;
    (window as any).__restorePut=()=>{IDBObjectStore.prototype.put=original;};
    IDBObjectStore.prototype.put=function(...args:any[]) {
      if (this.name==='notes') throw new DOMException('Storage full for test','QuotaExceededError');
      return original.apply(this,args as any);
    };
  });
  await editor.fill('Must survive a failed save');
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save failed · Retry',exact:true})).toBeVisible();
  await expect(editor).toContainText('Must survive a failed save');
  await page.evaluate(()=>(window as any).__restorePut());
  await page.getByRole('button',{name:'Save failed · Retry',exact:true}).click();
  await expectSaved(page);
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.getByRole('heading',{name:'My Bookshelf'})).toBeVisible();
  expect((await readNotes(page))[0].plainText).toBe('Must survive a failed save');
});
