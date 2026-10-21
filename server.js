const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const http = require('http');

const SECRET = "iraq2026_secret";
app.use((req,res,next)=>{ res.header("Access-Control-Allow-Origin","*"); next(); });
app.use(express.static(__dirname));

app.get('/api/channels', (req,res)=>{
  if(req.query.token !== SECRET) return res.status(403).send("Forbidden");
  const data = fs.readFileSync('./channels.m3u','utf8');
  res.type('text/plain').send(data);
});

// بروكسي بسيط يشتغل مع كل الروابط
app.get('/stream', (req,res)=>{
  if(req.query.token !== SECRET) return res.status(403).end();
  let url = req.query.url;
  if(!url) return res.status(400).end();
  url = decodeURIComponent(url);
  
  const client = url.startsWith('https') ? https : http;
  client.get(url, {headers:{"User-Agent":"VLC"}}, (r)=>{
    // اذا m3u8 عدل المسارات
    if(url.endsWith('.m3u8')){
      let body='';
      r.on('data',c=>body+=c);
      r.on('end',()=>{
        const base = url.substring(0, url.lastIndexOf('/')+1);
        body = body.split('\n').map(line=>{
          line=line.trim();
          if(line && !line.startsWith('#')){
            const full = line.startsWith('http')? line : base+line;
            return `/stream?url=${encodeURIComponent(full)}&token=${SECRET}`;
          }
          return line;
        }).join('\n');
        res.type('application/vnd.apple.mpegurl').send(body);
      });
    } else {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    }
  }).on('error', e=> res.status(500).send(e.message));
});

app.get('/', (req,res)=> res.sendFile(__dirname+'/index.html'));
app.listen(process.env.PORT||10000);
