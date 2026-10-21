const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs');
const app = express();

const SECRET_KEY = "iraq2026_secret";
app.use(cors());
app.use(express.static(__dirname));

// API يرجع القنوات بشكل صحيح
app.get('/api/channels', (req,res)=>{
  if(req.query.token !== SECRET_KEY) return res.status(403).send("Forbidden");
  try{
    const data = fs.readFileSync('./channels.m3u','utf8');
    const lines = data.split('\n');
    let newM3u = "";
    for(let i=0;i<lines.length;i++){
      let line = lines[i];
      if(line.trim().startsWith('#EXTINF') || line.trim().startsWith('#EXTM3U')){
        newM3u += line + "\n";
      } else if(line.trim().startsWith('http')){
        // حول الرابط الحقيقي الى رابط محمي
        const protectedUrl = `/stream?url=${encodeURIComponent(line.trim())}&token=${SECRET_KEY}`;
        newM3u += protectedUrl + "\n";
      } else if(line.trim() !== ""){
        newM3u += line + "\n";
      }
    }
    res.type('text/plain').send(newM3u);
  }catch(e){
    res.status(500).send("error reading channels.m3u");
  }
});

// البروكسي الي يشغل الرابط ويخفيه
app.get('/stream', async (req,res)=>{
  if(req.query.token !== SECRET_KEY) return res.status(403).end();
  const targetUrl = req.query.url;
  if(!targetUrl) return res.status(400).send("no url");
  try{
    const decodedUrl = decodeURIComponent(targetUrl);
    const response = await fetch(decodedUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": decodedUrl }
    });
    res.set('Access-Control-Allow-Origin','*');
    // اذا كان ملف m3u8 لازم نعدل الروابط الي داخله ايضا
    if(decodedUrl.includes('.m3u8')){
      let text = await response.text();
      text = text.replace(/(.*\.ts.*)/g, (m)=>{
        // حول مقاطع ts ايضا الى بروكسي
        return `/stream?url=${encodeURIComponent(new URL(m, decodedUrl).href)}&token=${SECRET_KEY}`;
      });
      res.type('application/vnd.apple.mpegurl').send(text);
    } else {
      response.body.pipe(res);
    }
  }catch(e){
    console.log(e);
    res.status(500).send("stream error: "+e.message);
  }
});

app.get('/', (req,res)=> res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log("running on "+PORT));
