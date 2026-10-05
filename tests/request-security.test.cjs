const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(path) {
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const context = { exports: {}, require, Buffer, URL, TextDecoder, Uint8Array };
  vm.runInNewContext(compiled.outputText, context);
  return context.exports;
}
const { cronAuthorized, smallJson } = load('src/lib/server/request-security.ts');
const { validPushEndpoint, validSubscription } = load('src/lib/push-validation.ts');
test('cron fails closed for missing, wrong, short and Unicode credentials', () => {
  const secret = 'a'.repeat(48);
  assert.equal(cronAuthorized('Bearer ' + secret, secret), true);
  for (const header of [null, '', 'Bearer ' + 'b'.repeat(48), 'Bearer ' + 'é'.repeat(48)]) assert.equal(cronAuthorized(header, secret), false);
  assert.equal(cronAuthorized('Bearer undefined', undefined), false);
  assert.equal(cronAuthorized('Bearer short', 'short'), false);
});
test('push URLs reject internal hosts, spoofed providers and credentials', () => {
  for (const endpoint of ['https://localhost/a','https://127.0.0.1/a','http://fcm.googleapis.com/a','https://fcm.googleapis.com.evil.test/a','https://evil.test@fcm.googleapis.com/a','https://fcm.googleapis.com:8080/a','https://[::1]/a','https://notify.windows.com.evil.test/a']) assert.equal(validPushEndpoint(endpoint), false, endpoint);
  assert.equal(validPushEndpoint('https://fcm.googleapis.com/fcm/send/test'), true);
  assert.equal(validSubscription({endpoint:'https://web.push.apple.com/test',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}}), true);
  assert.equal(validSubscription({endpoint:'https://web.push.apple.com/test',keys:{}}), false);
});
test('streaming body limit rejects oversized JSON even without Content-Length', async () => {
  assert.equal((await smallJson(new Request('https://test.invalid', {method:'POST',body:'{"ok":true}'}))).ok, true);
  await assert.rejects(smallJson(new Request('https://test.invalid',{method:'POST',body:'x'.repeat(4097)})), /too large/);
  await assert.rejects(smallJson(new Request('https://test.invalid',{method:'POST',body:'not-json'})));
});
