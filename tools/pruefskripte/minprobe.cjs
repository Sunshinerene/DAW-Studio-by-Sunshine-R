const es=require('/opt/npm-tools/node_modules/esbuild');const fs=require('fs');
const h=fs.readFileSync('work/index_ueberarbeitet.html','utf8');
let tot=0,tw=0,ti=0,css=0,cw=0;
const re=/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/g;let m;
while((m=re.exec(h))){const [_,tag,attr,body]=m; if(/text\/plain/.test(attr))continue; 
 try{ if(tag==='script'){tot+=body.length;tw+=es.transformSync(body,{minifyWhitespace:true,minifySyntax:true,loader:'js'}).code.length;ti+=es.transformSync(body,{minify:true,loader:'js'}).code.length}
 else{css+=body.length;cw+=es.transformSync(body,{minify:true,loader:'css'}).code.length}}catch(e){console.log('ERR',tag,attr.slice(0,40),String(e.message).slice(0,100))}}
console.log({js:tot,jsWhitespaceSyntax:tw,jsFull:ti,css,cssMin:cw});
const zlib=require('zlib');console.log('gzip html now',zlib.gzipSync(h).length,'spessa',533807);
