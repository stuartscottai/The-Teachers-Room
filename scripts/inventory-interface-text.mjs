import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const spanish = JSON.parse(fs.readFileSync('data/i18n/spanish-spain.json', 'utf8'));
const contextual = JSON.parse(fs.readFileSync('data/i18n/interface.json', 'utf8'));
const reviewPath = 'docs/translations/spanish-spain-review.csv';
const normalize = text => text.replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&rarr;/g, '→').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && c === ',') { row.push(cell); cell = ''; }
    else if (!quoted && c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  return rows;
}
// Runtime dictionaries are authoritative. Preserve review notes, never stale text.
const previous = new Map(fs.existsSync(reviewPath)
  ? parseCsv(fs.readFileSync(reviewPath, 'utf8').replace(/^\uFEFF/, '')).slice(1).map(row => [row[1], row]) : []);
const rows = new Map(Object.entries(spanish).map(([en, es]) => [normalize(en), { en, es, sources: new Set() }]));
const contextFor = file => file.includes('/games/') ? 'Game controls, settings or feedback'
  : file.includes('/class/') || file.includes('ClassBooklet') ? 'Workbook controls; authored lesson content stays in its original language'
  : file.includes('/school/') || file.includes('SchoolAdmin') ? 'School administration'
  : file.includes('SeoLandingPages') ? 'Footer landing page: public information for teachers'
  : file.includes('InfoPages') ? 'Help, contact or legal information'
  : file.includes('Profile') || file.includes('Plan') ? 'Account and profile'
  : file.includes('Page.tsx') ? 'Game format information' : 'Website interface';
function scan(file) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const row = rows.get(normalize(node.text));
      if (row) {
        row.sources.add(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`);
        row.context ||= contextFor(file);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(file) && !/SmokeTest|TestBench/.test(file)) scan(file);
  }
}
['components', 'pages', 'contexts'].forEach(walk); scan('App.tsx');
scan('data/blogPosts.ts');

// Keep the complete editorial translations in the same review reference.
function loadBlogModule(file, imports = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
  }}).outputText;
  const moduleExports = {};
  vm.runInNewContext(compiled, { exports: moduleExports, require: name => imports[name] });
  return moduleExports;
}
const rainBlog = loadBlogModule('data/blogRainOnlineLearning.ts');
const spanishBlog = loadBlogModule('data/blogPosts.es.ts', { './blogRainOnlineLearning': rainBlog });
const englishBlog = loadBlogModule('data/blogPosts.ts', { './blogPosts.es': spanishBlog, './blogRainOnlineLearning': rainBlog });
for (const post of englishBlog.publicBlogPosts) {
  for (const field of ['title', 'subtitle', 'date', 'content']) {
    rows.set(`blog.${post.id}.${field}`, {
      en: post[field].trim(), es: spanishBlog.spanishBlogPosts[post.id][field].trim(),
      context: `Blog article ${post.id}: ${field}${field === 'content' ? ' (complete article, HTML formatting retained)' : ''}`,
      sources: new Set([`data/blogPosts.ts: article ${post.id}, ${field}`, `data/blogPosts.es.ts: article ${post.id}, ${field}`])
    });
  }
}
for (const [key, value] of Object.entries(contextual)) {
  const row = rows.get(normalize(value.en));
  if (row) { row.context = value.context; row.sources.add(`data/i18n/interface.json: ${key}`); row.es = value.es; }
}
const output = [['ID', 'English', 'Spanish (Spain) draft', 'Context / purpose', 'Source locations', 'Review status', 'Implementation']];
let id = 0;
for (const row of [...rows.values()].sort((a, b) => a.en.localeCompare(b.en, 'en'))) {
  const prior = previous.get(row.en);
  output.push([`interface.${String(++id).padStart(4, '0')}`, row.en, row.es,
    prior?.[3] || row.context || 'Interface vocabulary or retained wording',
    [...row.sources].join(' | ') || 'data/i18n/spanish-spain.json',
    prior?.[5]?.startsWith('Approved') ? prior[5] : 'Contextual Spanish draft',
    row.sources.size ? 'Source present; runtime Spanish available' : 'Retained vocabulary / fallback wording']);
}
const quote = value => '"' + String(value).replace(/"/g, '""') + '"';
fs.mkdirSync('docs/translations', { recursive: true });
fs.writeFileSync(reviewPath, '\uFEFF' + output.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n');
console.log(`Exported ${output.length - 1} contextual Spanish drafts with source locations.`);
