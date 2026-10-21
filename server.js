const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs');
const app = express();

const SECRET_KEY = "iraq2026_secret"; // غير هذا الرمز بكيفك
const ALLOWED_APP = "your-app-package-name"; // اسم حزمة تطبيقك

app.use(cors());
app.use(express.static(__dirname));

app.get('/api/channels', (req,res)=>{
  // يتحقق ان الطلب جاي من تطبيقك فقط
  const token = req.query.token;
  if(token !== SECRET_KEY) return res.status(403).send("Forbidden");
  
  let data = fs.readFileSync('./channels.m3u','utf8');
  // يبدل الروابط الحقيقية بروابط وهمية محمية
  data = data.replace(/https:\/\/.+/g, (url)=>{
    return `/stream?url=${encodeURIComponent(url)}&token=${SECRET_KEY}`;
  });
  res.type('text/plain').send(data);
});

// بروكسي يحمي الرابط الاصلي
app.get('/stream', async (req,res)=>{
  if(req.query.token !== SECRET_KEY) return res.status(403).end();
  try{
    const response = await fetch(decodeURIComponent(req.query.url), {
      headers: { "User-Agent": "VLC/3.0" }
    });
    response.body.pipe(res);
  }catch(e){ res.status(500).send("stream error") }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log("running"));