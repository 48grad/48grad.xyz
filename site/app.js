(function () {
'use strict';

var doc = document.documentElement;
var sidebar = document.querySelector('.sidebar');
var main = document.getElementById('main');
var tree = document.getElementById('tree');
var searchInput = document.getElementById('search-input');

/* --- Theme --- */
var themeBtn = document.getElementById('theme-btn');

function updateThemeBtn() {
  themeBtn.textContent = doc.classList.contains('dark') ? '[light]' : '[dark]';
}

updateThemeBtn();

themeBtn.addEventListener('click', function () {
  var dark = !doc.classList.contains('dark');
  doc.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  updateThemeBtn();
});

/* --- State --- */
var allFiles = [];
var activeEl = null;
var fileContents = {};
var renderCache = {};
var folderData = new WeakMap();
var searchTimer = null;
var lowerCache = {};

var EXT_MAP = {
  yml: 'yaml', yaml: 'yaml', json: 'json', js: 'javascript', ts: 'typescript',
  py: 'python', sh: 'bash', bash: 'bash', toml: 'toml', html: 'html', css: 'css',
  xml: 'xml', sql: 'sql', rs: 'rust', go: 'go'
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textToHtml(t) {
  return t.trim().split(/\n{2,}/).map(function (p) {
    return '<p>' + esc(p).replace(/\n/g, ' ') + '</p>';
  }).join('');
}

/* --- Tree --- */
function buildTree(items, container, depth) {
  depth = depth || 0;
  var dirs = {};
  var files = [];

  for (var i = 0; i < items.length; i++) {
    var parts = items[i].path.split('/');
    if (parts.length === depth + 1) files.push(items[i]);
    else (dirs[parts[depth]] || (dirs[parts[depth]] = [])).push(items[i]);
  }

  var frag = document.createDocumentFragment();

  Object.keys(dirs).sort().forEach(function (name) {
    var el = document.createElement('div');
    el.className = 'tree-folder';
    el.innerHTML = '<div class="tree-folder-name">\u25B6' + esc(name) + '</div><div class="tree-children"></div>';
    folderData.set(el, { items: dirs[name], depth: depth + 1 });
    frag.appendChild(el);
  });

  files.sort(function (a, b) { return a.path.localeCompare(b.path); }).forEach(function (item) {
    var el = document.createElement('div');
    el.className = 'tree-file';
    el.textContent = item.path.split('/')[depth];
    el.dataset.path = item.path;
    frag.appendChild(el);
  });

  container.appendChild(frag);
}

tree.addEventListener('click', function (e) {
  var reveal = e.target.closest('[data-reveal]');
  if (reveal) return revealInTree(reveal.dataset.reveal);

  var file = e.target.closest('.tree-file[data-path]');
  if (file) return loadFile(file.dataset.path, file);

  var label = e.target.closest('.tree-folder-name');
  if (!label) return;

  var folder = label.parentElement;
  var children = folder.querySelector('.tree-children');
  label.classList.toggle('open');
  children.classList.toggle('open');

  if (!children.hasChildNodes()) {
    var data = folderData.get(folder);
    if (data) buildTree(data.items, children, data.depth);
  }
});

/* --- Highlight.js lazy load --- */
var hljsLoaded = false;

function loadHljs() {
  if (hljsLoaded) return Promise.resolve();
  return new Promise(function (resolve) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    link.integrity = 'sha384-eFTL69TLRZTkNfYZOLM+G04821K1qZao/4QLJbet1pP4tcF+fdXq/9CdqAbWRl/L';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.integrity = 'sha384-F/bZzf7p3Joyp5psL90p/p89AZJsndkSoGwRpXcZhleCWhd8SnRuoYo4d0yirjJp';
    script.crossOrigin = 'anonymous';
    script.onload = function () { hljsLoaded = true; resolve(); };
    document.head.appendChild(script);
  });
}

/* --- Load file --- */
async function loadFile(path, el) {
  if (activeEl) activeEl.classList.remove('active');
  el.classList.add('active');
  activeEl = el;
  sidebar.classList.remove('open');

  if (!fileContents[path]) { main.innerHTML = 'File not found.'; return; }
  if (renderCache[path]) { main.innerHTML = renderCache[path]; return; }

  var ext = path.split('.').pop().toLowerCase();
  var isMd = ext === 'md';
  var lang = EXT_MAP[ext];
  var body;

  if (isMd) body = DOMPurify.sanitize(marked.parse(fileContents[path]));
  else if (lang) body = '<div class="raw-text"><code class="language-' + esc(lang) + '">' + esc(fileContents[path]) + '</code></div>';
  else body = '<div class="content-plain">' + textToHtml(fileContents[path]) + '</div>';

  main.innerHTML = '<div class="breadcrumb"><button class="menu-btn">\u2630</button>' + esc(path).replace(/\//g, ' / ') + '</div><div class="content">' + body + '</div>';

  if (!isMd && lang) {
    await loadHljs();
    var code = main.querySelector('code');
    if (code) hljs.highlightElement(code);
  }

  renderCache[path] = main.innerHTML;
}

/* --- Search --- */
function getSnippet(text, query) {
  var idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  var start = Math.max(0, idx - 30);
  var end = Math.min(text.length, idx + query.length + 30);
  var raw = text.slice(start, end).replace(/\n/g, ' ');
  var escaped = esc(raw);
  var re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (start > 0 ? '\u2026' : '') + escaped.replace(re, function (m) { return '<mark>' + m + '</mark>'; }) + (end < text.length ? '\u2026' : '');
}

function onSearch(q) {
  clearTimeout(searchTimer);
  if (q.trim().length < 2) { tree.innerHTML = ''; buildTree(allFiles, tree); return; }
  searchTimer = setTimeout(function () { doSearch(q.trim()); }, 150);
}

function doSearch(q) {
  var ql = q.toLowerCase();
  var results = allFiles.filter(function (item) {
    if (item._lp.includes(ql)) return true;
    if (!lowerCache[item.path] && fileContents[item.path]) lowerCache[item.path] = fileContents[item.path].toLowerCase();
    return lowerCache[item.path] && lowerCache[item.path].includes(ql);
  });

  tree.innerHTML = '';
  if (!results.length) {
    tree.innerHTML = '<div style="font-size:.7rem;color:#888">No results.</div>';
    return;
  }

  var frag = document.createDocumentFragment();
  results.forEach(function (item) {
    var snippet = fileContents[item.path] ? getSnippet(fileContents[item.path], q) : null;
    var el = document.createElement('div');
    el.style.marginBottom = '.4rem';
    el.innerHTML = '<div class="tree-file" data-reveal="' + esc(item.path) + '">' + esc(item.path) + '</div>' + (snippet ? '<div class="search-result-snippet">' + snippet + '</div>' : '');
    frag.appendChild(el);
  });
  tree.appendChild(frag);
}

function revealInTree(path) {
  searchInput.value = '';
  tree.innerHTML = '';
  buildTree(allFiles, tree);

  var parts = path.split('/');
  var container = tree;

  for (var i = 0; i < parts.length - 1; i++) {
    var folder = Array.from(container.querySelectorAll(':scope > .tree-folder')).find(function (f) {
      var name = f.querySelector('.tree-folder-name');
      return name && name.textContent.replace('\u25B6', '').trim() === parts[i];
    });
    if (!folder) return;

    var label = folder.querySelector('.tree-folder-name');
    var children = folder.querySelector('.tree-children');
    if (!children.classList.contains('open')) {
      label.classList.toggle('open');
      children.classList.toggle('open');
      if (!children.hasChildNodes()) {
        var data = folderData.get(folder);
        if (data) buildTree(data.items, children, data.depth);
      }
    }
    container = children;
  }

  var target = Array.from(container.querySelectorAll(':scope > .tree-file'))
    .find(function (f) { return f.textContent.trim() === parts[parts.length - 1]; });
  if (target) {
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    loadFile(target.dataset.path, target);
  }
}

/* --- Event listeners --- */
document.querySelector('.sidebar-header a').addEventListener('click', function (e) {
  e.preventDefault();
  var readmeEl = document.querySelector('.static-files .tree-file');
  if (fileContents['README.md']) { loadFile('README.md', readmeEl); return; }
  main.innerHTML = '';
  if (activeEl) { activeEl.classList.remove('active'); activeEl = null; }
});

document.querySelectorAll('.static-files .tree-file').forEach(function (el) {
  el.addEventListener('click', function () { loadFile(this.dataset.file, this); });
});

searchInput.addEventListener('input', function () { onSearch(this.value); });

document.querySelector('.sidebar-overlay').addEventListener('click', function () {
  sidebar.classList.remove('open');
});

main.addEventListener('click', function (e) {
  if (e.target.closest('.menu-btn')) sidebar.classList.toggle('open');
});

/* --- Init --- */
(async function () {
  try {
    var res = await fetch('/data.json');
    if (!res.ok) throw new Error(res.status);
    var data = await res.json();
    Object.assign(fileContents, data.contents);
    allFiles = data.tree;
    allFiles.forEach(function (item) { item._lp = item.path.toLowerCase(); });

    var info = '';
    if (data.commitHash) {
      info = 'Build: ' + (data.branch ? '[' + data.branch + '] ' : '') + data.commitHash + ' \u00B7 ' + (data.buildTime || '').substring(0, 10);
    }
    document.getElementById('build-info').textContent = info;

    tree.innerHTML = '';
    buildTree(allFiles, tree);

    var readmeEl = document.querySelector('.static-files .tree-file');
    if (fileContents['README.md'] && readmeEl && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
      loadFile('README.md', readmeEl);
    }
  } catch (e) {
    tree.innerHTML = 'Failed to load.';
  }
})();
})();
