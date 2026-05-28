#!/usr/bin/env node
// [LOG: 20260528_1735]
// Precise batch-fix: replace old defaultLang pattern with resolveLocalePreference
// Strategy: Keep variable names (userLanguage, lang, etc.) intact.
//           Only replace the VALUE computation from defaultLang/prefersKorean to resolveLocalePreference.

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '../app');

function findFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full));
    else if (/\.(tsx?|ts)$/.test(entry.name)) results.push(full);
  }
  return results;
}

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf-8');
  const orig = src;

  // Skip if already using resolveLocalePreference AND no old defaultLang pattern
  if (src.includes('resolveLocalePreference') && !src.includes("cookieLang ?? (prefersKorean ? 'ko' : 'en')")) {
    return null; // already good
  }

  // Skip if no old pattern at all
  if (!src.includes("cookieLang ?? (prefersKorean ? 'ko' : 'en')")) {
    return null;
  }

  const changes = [];

  // Step 1: Add import if not present
  if (!src.includes('resolveLocalePreference')) {
    // Insert after the last import line
    const importLine = "import { resolveLocalePreference } from '@/lib/language'";
    
    if (src.includes("import { t } from '@/lib/i18n'")) {
      src = src.replace(
        "import { t } from '@/lib/i18n'",
        "import { t } from '@/lib/i18n'\n" + importLine
      );
    } else if (src.includes("import { t, type Locale } from '@/lib/i18n'")) {
      src = src.replace(
        "import { t, type Locale } from '@/lib/i18n'",
        "import { t, type Locale } from '@/lib/i18n'\n" + importLine
      );
    } else {
      // Insert after last import
      const lines = src.split('\n');
      let lastImport = 0;
      lines.forEach((l, i) => { if (l.startsWith('import ')) lastImport = i; });
      lines.splice(lastImport + 1, 0, importLine);
      src = lines.join('\n');
    }
    changes.push('added import');
  }

  // Step 2: Replace ALL occurrences of the 2-line block:
  //   const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  //   const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')
  //
  // We need to handle various indentation levels (2 spaces typically)
  src = src.replace(
    /(\s*)const prefersKorean = acceptLanguage\.toLowerCase\(\)\.includes\('ko'\)\n\s*const defaultLang = cookieLang \?\? \(prefersKorean \? 'ko' : 'en'\)/g,
    '$1// [LOG: 20260528_1735] Replaced old locale pattern with resolveLocalePreference'
  );
  changes.push('removed prefersKorean + defaultLang declarations');

  // Step 3: Replace references to defaultLang in value positions
  // Pattern: "let lang = defaultLang" => "let lang = resolveLocalePreference({cookieLanguage: cookieLang, acceptLanguage})"
  src = src.replace(
    /let (lang|userLanguage) = defaultLang\b/g,
    'let $1 = resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })'
  );

  // Pattern: "const lang = ... ?? defaultLang" or "const userLanguage = ... ?? defaultLang"
  src = src.replace(
    /const (lang|userLanguage) = ([^?]+)\?\? defaultLang\b/g,
    'const $1 = $2?? resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })'
  );

  // Pattern: "= profile?.language ?? defaultLang" or "= profile.language ?? defaultLang"
  src = src.replace(
    /= (profile\??\.language) \?\? defaultLang\b/g,
    '= resolveLocalePreference({ profileLanguage: $1, cookieLanguage: cookieLang, acceptLanguage })'
  );

  // Pattern: standalone "?? defaultLang" in other contexts  
  // e.g. "lang = profile?.language ?? defaultLang" already handled above
  // But there might be: "return { title: t('...', defaultLang) }" — no, that's not ?? but direct usage
  
  // Pattern: direct use as function arg "t('...', defaultLang)"
  src = src.replace(
    /\bdefaultLang\b/g,
    'resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })'
  );

  if (src !== orig) {
    fs.writeFileSync(filePath, src, 'utf-8');
    return changes;
  }
  return null;
}

// Run
const files = findFiles(APP_DIR);
let fixed = 0;

for (const f of files) {
  const changes = fixFile(f);
  if (changes) {
    console.log('✅', f.replace(APP_DIR, 'app'));
    changes.forEach(c => console.log('   →', c));
    fixed++;
  }
}

console.log(`\n🏁 Fixed ${fixed} files\n`);

// Verify
console.log('=== Remaining old-pattern references ===');
let remaining = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("cookieLang ?? (prefersKorean")) {
      console.log(`  ⚠️  ${f.replace(APP_DIR, 'app')}:${i+1} — old defaultLang pattern`);
      remaining++;
    }
    if (/\bprefersKorean\b/.test(lines[i]) && !lines[i].includes('//')) {
      console.log(`  ⚠️  ${f.replace(APP_DIR, 'app')}:${i+1} — prefersKorean reference`);
      remaining++;
    }
  }
}
if (remaining === 0) console.log('  ✅ All clean!');
