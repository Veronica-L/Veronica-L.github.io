const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.KIKI_PREVIEW_DIST === '1' ? path.join(__dirname, 'dist') : __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {'.mjs':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.wav':'audio/wav','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
  const pageRoot = pathname.startsWith('/posts/') ? path.join(__dirname, 'dist') : root;
  const file = path.resolve(pageRoot,'.' + (pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(pageRoot+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    if(pathname==='/diagram-frame.mjs'||pathname.startsWith('/vendor/mermaid/'))headers['Access-Control-Allow-Origin']='*';
    const range=req.headers.range;
    if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
    else {res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res);}
  });
}).listen(port,'127.0.0.1',()=>console.log(`Kiki's Blog 原型已启动： http://127.0.0.1:${port}`));
