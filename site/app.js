(function(){
'use strict';

/* --- Theme (checkbox init — class already set by inline script) --- */
function toggleTheme(dark){
  document.documentElement.classList.toggle('dark',dark);
  localStorage.setItem('theme',dark?'dark':'light');
}
var themeCb=document.getElementById('theme-cb');
themeCb.checked=document.documentElement.classList.contains('dark');
themeCb.addEventListener('change',function(){toggleTheme(this.checked)});

/* --- State --- */
var aF=[],aE=null;
var fC={},rC={},dD=new WeakMap();
var EM={yml:'yaml',yaml:'yaml',json:'json',js:'javascript',ts:'typescript',
  py:'python',sh:'bash',bash:'bash',toml:'toml',html:'html',css:'css',
  xml:'xml',sql:'sql',rs:'rust',go:'go'};

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
var $m=document.getElementById('main');
var $t=document.getElementById('tree');
var $s=document.getElementById('search-input');

/* --- Tree --- */
function buildTreeFromFlat(items,c,depth){
  depth=depth||0;
  var dirs={},files=[];
  for(var i=0;i<items.length;i++){
    var p=items[i].path.split('/');
    if(p.length===depth+1)files.push(items[i]);
    else(dirs[p[depth]]||(dirs[p[depth]]=[])).push(items[i]);
  }
  var fg=document.createDocumentFragment();
  Object.keys(dirs).sort().forEach(function(d){
    var f=document.createElement('div');
    f.className='tree-folder';
    f.innerHTML='<div class="tree-folder-name"><span class="arrow">\u25B6</span>'+esc(d)+'</div><div class="tree-children"></div>';
    dD.set(f,{items:dirs[d],depth:depth+1});
    fg.appendChild(f);
  });
  files.sort(function(a,b){return a.path.localeCompare(b.path)}).forEach(function(item){
    var f=document.createElement('div');
    f.className='tree-file';
    f.textContent=item.path.split('/')[depth];
    f.dataset.path=item.path;
    fg.appendChild(f);
  });
  c.appendChild(fg);
}

$t.addEventListener('click',function(e){
  var rv=e.target.closest('[data-reveal]');
  if(rv)return revealInTree(rv.dataset.reveal);
  var fi=e.target.closest('.tree-file[data-path]');
  if(fi)return loadFile(fi.dataset.path,fi);
  var la=e.target.closest('.tree-folder-name');
  if(!la)return;
  var fo=la.parentElement,ch=fo.querySelector('.tree-children');
  la.classList.toggle('open');
  ch.classList.toggle('open');
  if(!ch.hasChildNodes()){
    var d=dD.get(fo);
    if(d)buildTreeFromFlat(d.items,ch,d.depth);
  }
});

/* --- Highlight.js lazy load --- */
var hR=false;
function loadHljs(){
  if(hR)return Promise.resolve();
  return new Promise(function(r){
    var c=document.createElement('link');
    c.rel='stylesheet';
    c.href='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    c.integrity='sha384-eFTL69TLRZTkNfYZOLM+G04821K1qZao/4QLJbet1pP4tcF+fdXq/9CdqAbWRl/L';
    c.crossOrigin='anonymous';
    document.head.appendChild(c);
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    s.integrity='sha384-F/bZzf7p3Joyp5psL90p/p89AZJsndkSoGwRpXcZhleCWhd8SnRuoYo4d0yirjJp';
    s.crossOrigin='anonymous';
    s.onload=function(){hR=true;r()};
    document.head.appendChild(s);
  });
}

var toP=function(t){
  return t.trim().split(/\n{2,}/).map(function(p){return'<p>'+esc(p).replace(/\n/g,' ')+'</p>'}).join('');
};

/* --- Load file --- */
async function loadFile(path,el){
  if(aE)aE.classList.remove('active');
  el.classList.add('active');
  aE=el;
  document.querySelector('.sidebar').classList.remove('open');
  if(!fC[path]){$m.innerHTML='File not found.';return}
  if(rC[path]){$m.innerHTML=rC[path];return}
  var ext=path.split('.').pop().toLowerCase(),isMd=ext==='md';
  var lang=EM[ext];
  var body;
  if(isMd)body=DOMPurify.sanitize(marked.parse(fC[path]));
  else if(lang)body='<div class="raw-text"><code class="language-'+esc(lang)+'">'+esc(fC[path])+'</code></div>';
  else body='<div class="content-plain">'+toP(fC[path])+'</div>';
  $m.innerHTML='<div class="breadcrumb"><button class="menu-btn">\u2630</button>'+esc(path).replace(/\//g,' / ')+'</div><div class="content">'+body+'</div>';
  if(!isMd&&lang){
    await loadHljs();
    var b=$m.querySelector('code');
    if(b)hljs.highlightElement(b);
  }
  rC[path]=$m.innerHTML;
}

/* --- Search --- */
function getSnippet(t,q){
  var idx=t.toLowerCase().indexOf(q.toLowerCase());
  if(idx===-1)return null;
  var s=Math.max(0,idx-30),e=Math.min(t.length,idx+q.length+30);
  var raw=t.slice(s,e).replace(/\n/g,' ');
  var escaped=esc(raw);
  var re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
  return(s>0?'\u2026':'')+escaped.replace(re,function(m){return'<mark>'+m+'</mark>'})+(e<t.length?'\u2026':'');
}

var sT=null,lC={};
function onSearch(q){
  clearTimeout(sT);
  if(q.trim().length<2){$t.innerHTML='';buildTreeFromFlat(aF,$t);return}
  sT=setTimeout(function(){doSearch(q.trim())},150);
}

function doSearch(q){
  var ql=q.toLowerCase();
  var res=aF.filter(function(i){
    if(i._lp.includes(ql))return true;
    if(!lC[i.path]&&fC[i.path])lC[i.path]=fC[i.path].toLowerCase();
    return lC[i.path]&&lC[i.path].includes(ql);
  });
  $t.innerHTML='';
  if(!res.length){
    $t.innerHTML='<div style="font-size:.7rem;color:#888">No results.</div>';
    return;
  }
  var fg=document.createDocumentFragment();
  res.forEach(function(i){
    var sn=fC[i.path]?getSnippet(fC[i.path],q):null;
    var f=document.createElement('div');
    f.style.marginBottom='.4rem';
    f.innerHTML='<div class="tree-file" data-reveal="'+esc(i.path)+'">'+esc(i.path)+'</div>'+(sn?'<div class="search-result-snippet">'+sn+'</div>':'');
    fg.appendChild(f);
  });
  $t.appendChild(fg);
}

function revealInTree(path){
  $s.value='';
  $t.innerHTML='';
  buildTreeFromFlat(aF,$t);
  var parts=path.split('/');
  var c=$t;
  for(var i=0;i<parts.length-1;i++){
    var folder=Array.from(c.querySelectorAll(':scope > .tree-folder')).find(function(f){
      var n=f.querySelector('.tree-folder-name');
      return n&&n.textContent.replace('\u25B6','').trim()===parts[i];
    });
    if(!folder)return;
    var la=folder.querySelector('.tree-folder-name');
    var ch=folder.querySelector('.tree-children');
    if(!ch.classList.contains('open')){
      la.classList.toggle('open');
      ch.classList.toggle('open');
      if(!ch.hasChildNodes()){
        var d=dD.get(folder);
        if(d)buildTreeFromFlat(d.items,ch,d.depth);
      }
    }
    c=ch;
  }
  var fe=Array.from(c.querySelectorAll(':scope > .tree-file'))
    .find(function(f){return f.textContent.trim()===parts[parts.length-1]});
  if(fe){
    fe.scrollIntoView({block:'nearest',behavior:'smooth'});
    loadFile(fe.dataset.path,fe);
  }
}

function showWelcome(){
  var readmeEl=document.querySelector('.static-files .tree-file');
  if(fC['README.md']){loadFile('README.md',readmeEl);return}
  $m.innerHTML='';
  if(aE){aE.classList.remove('active');aE=null}
}

/* --- Event listeners --- */
document.querySelector('.sidebar-header a').addEventListener('click',function(e){
  e.preventDefault();
  showWelcome();
});

document.querySelectorAll('.static-files .tree-file').forEach(function(el){
  el.addEventListener('click',function(){
    loadFile(this.dataset.file,this);
  });
});

$s.addEventListener('input',function(){onSearch(this.value)});

document.querySelector('.sidebar-overlay').addEventListener('click',function(){
  document.querySelector('.sidebar').classList.remove('open');
});

/* Menu button — event delegation covers static + dynamic buttons */
$m.addEventListener('click',function(e){
  if(e.target.closest('.menu-btn')){
    document.querySelector('.sidebar').classList.toggle('open');
  }
});

/* --- Init --- */
(async function(){
  try{
    var res=await fetch('/data.json');
    if(!res.ok)throw new Error(res.status);
    var data=await res.json();
    Object.assign(fC,data.contents);
    aF=data.tree;
    aF.forEach(function(i){i._lp=i.path.toLowerCase()});
    document.getElementById('build-info').textContent=data.commitHash?'Build: '+data.commitHash+' \u00B7 '+(data.buildTime||'').substring(0,10):'';
    $t.innerHTML='';
    buildTreeFromFlat(aF,$t);
    var readmeEl=document.querySelector('.static-files .tree-file');
    if(fC['README.md']&&readmeEl&&typeof marked!=='undefined'&&typeof DOMPurify!=='undefined'){
      loadFile('README.md',readmeEl);
    }
  }catch(e){$t.innerHTML='Failed to load.'}
})();
})();
