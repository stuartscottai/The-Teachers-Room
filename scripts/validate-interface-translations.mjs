import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const spanish = JSON.parse(fs.readFileSync('data/i18n/spanish-spain.json', 'utf8'));
const contextual = JSON.parse(fs.readFileSync('data/i18n/interface.json', 'utf8'));
const normalize = value => value.replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&rarr;/g, '→').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const dictionary = new Map(Object.entries(spanish).map(([en, es]) => [normalize(en), es]));
const failures = [];
const fields = value => [...value.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]);
for (const [en, es] of Object.entries(spanish)) {
  if (!es.trim()) failures.push(`Missing Spanish: ${en}`);
  if (/cuestionarios? en directo|Live Quiz Challenge/i.test(es)) failures.push(`Use the game name Live Quiz in Spanish: ${en}`);
  for (const field of fields(es)) if (!fields(en).includes(field)) failures.push(`Unknown Spanish variable {${field}}: ${en}`);
}
for (const [key, entry] of Object.entries(contextual)) if (!entry.en.trim() || !entry.es.trim()) failures.push(`Incomplete contextual entry: ${key}`);
function checkKey(node, file) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (!dictionary.has(normalize(node.text))) failures.push(`Untranslated interface literal in ${file}: ${node.text}`);
  } else if (ts.isConditionalExpression(node)) {
    checkKey(node.whenTrue, file); checkKey(node.whenFalse, file);
  } else if (ts.isArrayLiteralExpression(node)) {
    node.elements.forEach(element => checkKey(element, file));
  }
}
function scan(file) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(sf) === 'ui' && node.arguments[0]) {
      checkKey(node.arguments[0], file);
      const parent = node.parent;
      if (ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind)) {
        failures.push(`Translated copy used as a game-state identifier in ${file}: ${parent.getText(sf)}`);
      }
      // Quiz material can be inserted as values, but never passed for translation.
      const input = node.arguments[0].getText(sf);
      if (/^(?:activeQ|currentQuestion|question|q|exercise)\.(?:text|question|answer|options)\b/.test(input)) failures.push(`Teaching content passed to translation in ${file}: ${input}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(file)) scan(file);
  }
}
['components', 'pages', 'contexts'].forEach(walk); scan('App.tsx');

// Entire temporary teaching workbooks, including their controls, must stay English.
for (const file of ['pages/ClassBooklet.tsx', 'components/class/ReadingPassage.tsx',
  'components/class/WorkbookExercise.tsx', 'components/class/WorkbookSection.tsx', 'components/class/PrintableBooklet.tsx']) {
  if (/\b(?:translateInterfaceText|useInterfaceLanguage)\b/.test(fs.readFileSync(file, 'utf8'))) {
    failures.push(`English-only workbook must not use website translations: ${file}`);
  }
}

// These website-owned content lists need translations even though the render
// calls use variables. Checking literal ui() calls alone misses these sections.
function checkContentList(file, variable, properties) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node, inside = false) {
    const inList = inside || (ts.isVariableDeclaration(node) && node.name.getText(sf) === variable);
    if (inList && ts.isPropertyAssignment(node) && properties.includes(node.name.getText(sf))) checkKey(node.initializer, file);
    if (inList && ts.isArrayLiteralExpression(node) && properties.includes('features')) {
      for (const element of node.elements) if (ts.isStringLiteral(element)) checkKey(element, file);
    }
    ts.forEachChild(node, child => visit(child, inList));
  }
  visit(sf);
}
checkContentList('pages/InfoPages.tsx', 'faqs', ['question', 'answer']);
checkContentList('pages/InfoPages.tsx', 'searchableSections', ['body']);
checkContentList('components/TestimonialCarousel.tsx', 'testimonials', ['role', 'title', 'quote']);
checkContentList('pages/ChangePlan.tsx', 'PLAN_DEFS', ['features']);
checkContentList('pages/SeoLandingPages.tsx', 'pages', ['badge', 'title', 'intro', 'bullets', 'examples', 'cta']);

function loadBlogModule(file, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
  }}).outputText;
  const moduleExports = {};
  vm.runInNewContext(source, { exports: moduleExports, require: name => imports[name] });
  return moduleExports;
}
const rainBlog = loadBlogModule('data/blogRainOnlineLearning.ts');
const spanishBlog = loadBlogModule('data/blogPosts.es.ts', { './blogRainOnlineLearning': rainBlog });
const englishBlog = loadBlogModule('data/blogPosts.ts', { './blogPosts.es': spanishBlog, './blogRainOnlineLearning': rainBlog });
for (const post of englishBlog.publicBlogPosts) {
  const translated = spanishBlog.spanishBlogPosts[post.id];
  for (const field of ['title', 'subtitle', 'date', 'content']) {
    if (!translated?.[field]?.trim()) failures.push(`Missing Spanish blog ${post.id}: ${field}`);
  }
  if (translated?.content) {
    const tags = html => html.match(/<[^>]+>/g) || [];
    if (JSON.stringify(tags(post.content)) !== JSON.stringify(tags(translated.content))) {
      failures.push(`Spanish blog ${post.id}: HTML structure or link attributes differ from the original`);
    }
  }
}

// Exercise the actual helper, including original-content and language-switch rules.
const source = ts.transpileModule(fs.readFileSync('utils/interfaceLanguage.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText;
const storage = new Map(); const exports = {};
vm.runInNewContext(source, {
  exports, require: name => name === 'react' ? {} : name.endsWith('spanish-spain.json') ? spanish : contextual,
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  window: { dispatchEvent() {} }, Event
});
const originalName = 'Correct {name} <valencià>';
assert.equal(exports.translateInterfaceText('WINNER: {name}', { name: originalName }), `WINNER: ${originalName}`);
exports.setInterfaceLanguage('es');
assert.equal(exports.translateInterfaceText('WINNER: {name}', { name: originalName }), `GANADOR: ${originalName}`);
assert.equal(exports.displayTeamName('Team 2'), 'Equipo 2');
assert.equal(exports.displayTeamName('Els mussols'), 'Els mussols');
assert.equal(exports.translateInterfaceText(' Team {number} ', { number: 0 }), ' Equipo 0 ');
exports.setInterfaceLanguage('en');
assert.equal(exports.displayTeamName('Team 2'), 'Team 2');
if (failures.length) {
  console.error(failures.join('\n')); process.exitCode = 1;
} else console.log(`Interface translation validation passed: ${Object.keys(spanish).length} Spanish entries and ${englishBlog.publicBlogPosts.length} complete blog translations; original teaching content preserved.`);
