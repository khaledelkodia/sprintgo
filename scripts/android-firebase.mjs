#!/usr/bin/env node
/**
 * Wire Firebase into a freshly-generated Capacitor Android project.
 *
 * `cap add android` regenerates android/ on every CI run, so the google-services
 * plugin and the credentials file cannot live in git — they are applied here,
 * after generation and before gradle.
 *
 * Without the GOOGLE_SERVICES_JSON secret this exits quietly and the APK still
 * builds; it just has no push. That is deliberate: a fork or a first-time clone
 * must not need a Firebase project to produce an installable app.
 *
 *   node scripts/android-firebase.mjs apps/customer
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const GOOGLE_SERVICES_VERSION = '4.4.2';

const appDir = resolve(process.argv[2] ?? '.');
const androidDir = join(appDir, 'android');

const raw = process.env.GOOGLE_SERVICES_JSON ?? '';
if (!raw.trim()) {
  console.log('· GOOGLE_SERVICES_JSON not set — building without push (this is fine).');
  process.exit(0);
}
if (!existsSync(androidDir)) {
  console.error(`✗ ${androidDir} does not exist — run "cap add android" first.`);
  process.exit(1);
}

// the secret may be raw JSON or base64 (GitHub secrets survive base64 more reliably)
let json = raw.trim();
if (!json.startsWith('{')) {
  json = Buffer.from(json, 'base64').toString('utf8').trim();
}
try {
  JSON.parse(json);
} catch {
  console.error('✗ GOOGLE_SERVICES_JSON is neither valid JSON nor base64-encoded JSON.');
  process.exit(1);
}

writeFileSync(join(androidDir, 'app', 'google-services.json'), json);
console.log('· wrote android/app/google-services.json');

/** Insert `line` into a gradle file unless it is already there. */
function addOnce(file, marker, insert, after) {
  const path = join(androidDir, file);
  const text = readFileSync(path, 'utf8');
  if (text.includes(marker)) {
    console.log(`· ${file} already wired`);
    return;
  }
  const at = text.indexOf(after);
  if (at === -1) {
    console.error(`✗ could not find "${after}" in ${file}`);
    process.exit(1);
  }
  const cut = at + after.length;
  writeFileSync(path, text.slice(0, cut) + insert + text.slice(cut));
  console.log(`· patched ${file}`);
}

// root build.gradle: the google-services classpath
addOnce(
  'build.gradle',
  'com.google.gms:google-services',
  `\n        classpath 'com.google.gms:google-services:${GOOGLE_SERVICES_VERSION}'`,
  'dependencies {',
);

// app build.gradle: apply the plugin at the end, where google-services expects it
const appGradlePath = join(androidDir, 'app', 'build.gradle');
const appGradle = readFileSync(appGradlePath, 'utf8');
if (appGradle.includes('com.google.gms.google-services')) {
  console.log('· app/build.gradle already wired');
} else {
  writeFileSync(appGradlePath, `${appGradle}\napply plugin: 'com.google.gms.google-services'\n`);
  console.log('· patched app/build.gradle');
}

console.log('✓ Firebase wired — this APK can receive push.');
