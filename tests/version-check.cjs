const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync('assets/site.js', 'utf8');

async function scenario(version, href = 'https://apogeeio.github.io/zh/blog/?tag=x#note', fails = false) {
  let destination = null;
  runInNewContext(source, {
    document: {
      visibilityState: 'visible',
      querySelector: () => ({ content: 'aaaaaaaaaaaaaaaa' }),
      addEventListener() {},
    },
    window: {
      location: { href, replace: value => { destination = value; } },
      addEventListener() {}, setInterval() {},
    },
    URL, Date,
    fetch: async () => {
      if (fails) throw new Error('Offline');
      return { ok: true, json: async () => ({ version }) };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  return destination;
}

(async () => {
  assert.equal(await scenario('aaaaaaaaaaaaaaaa'), null);
  assert.equal(await scenario('bbbbbbbbbbbbbbbb'), 'https://apogeeio.github.io/zh/blog/?tag=x&v=bbbbbbbbbbbbbbbb#note');
  assert.equal(await scenario('bbbbbbbbbbbbbbbb', 'https://apogeeio.github.io/?v=bbbbbbbbbbbbbbbb'), null);
  assert.equal(await scenario('invalid'), null);
  assert.equal(await scenario('bbbbbbbbbbbbbbbb', undefined, true), null);
  console.log('Version refresh: current, new, loop guard, invalid, and offline cases passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
