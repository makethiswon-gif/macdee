/* Isolated validation and encryption tests. No environment file, network, DB, or real credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function (name, parent, isMain) { if (name === 'server-only') return {}; return originalLoad.call(this, name, parent, isMain); };
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file }).outputText, file);

process.env.PORTAL_CREDENTIALS_KEY = 'qa-only-encryption-key-at-least-32-characters';
const schema = require('../lib/portal-marketing-profile.ts');
const vault = require('../lib/portal-credentials.ts');
const firmA = '00000000-0000-4000-8000-000000000001';
const firmB = '00000000-0000-4000-8000-000000000002';

const profile = schema.validateMarketingProfile({ website_url: ' https://law.example ', approval_process: ' 담당자 승인 ' });
assert.deepEqual(profile, { website_url: 'https://law.example', approval_process: '담당자 승인' });
for (const bad of [null, [], { unknown: 'x' }, { website_url: 'javascript:alert(1)' }, { website_url: 'ftp://law.example' }, { other_notes: 'x'.repeat(5001) }]) assert.throws(() => schema.validateMarketingProfile(bad));
assert.deepEqual(schema.validateMarketingSecrets({ ftp_username: ' user ', ftp_password: ' password ' }), { ftp_username: 'user', ftp_password: 'password' });
for (const bad of [null, [], { unknown: 'x' }, { ftp_password: 'x'.repeat(1001) }]) assert.throws(() => schema.validateMarketingSecrets(bad));
assert.deepEqual(schema.validateClearSecrets(['ftp_password', 'ftp_password']), ['ftp_password']);
assert.throws(() => schema.validateClearSecrets(['not-a-key']));

const plaintext = { ftp_username: 'fixture-user', ftp_password: 'fixture-secret' };
const encrypted = vault.encryptPortalCredentials(firmA, plaintext);
assert.ok(encrypted.startsWith('v1.'));
assert.ok(!encrypted.includes('fixture-user') && !encrypted.includes('fixture-secret'));
assert.deepEqual(vault.decryptPortalCredentials(firmA, encrypted), plaintext);
assert.throws(() => vault.decryptPortalCredentials(firmB, encrypted));
assert.throws(() => vault.decryptPortalCredentials(firmA, encrypted.slice(0, -1) + (encrypted.endsWith('A') ? 'B' : 'A')));
assert.equal(vault.encryptPortalCredentials(firmA, {}), null);
delete process.env.PORTAL_CREDENTIALS_KEY;
assert.throws(() => vault.encryptPortalCredentials(firmA, plaintext), vault.PortalCredentialsConfigurationError);

console.log('PASS portal marketing profile: allowlists, URL validation, encrypted envelope, tenant binding, tamper rejection, dedicated key requirement (no network/DB).');
