const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual API wrapper with synthetic responses; no network or account data.
let response;
const scope = {
  exports: {}, Headers, URLSearchParams,
  require: (name) => {
    assert.equal(name, '@/lib/apiClient');
    return { apiFetch: async () => response };
  },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/rentBillApi.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, scope);
const api = scope.exports;
const form = { items: [], adjustmentAmount: '', adjustmentNote: '', dueDate: '', note: '' };
const operations = [
  () => api.createRentBill('assignment', '2026-10', form),
  () => api.updateRentBill('bill', form),
  () => api.deleteRentBill('bill'),
];
async function run() {
  for (const operation of operations) {
    response = { ok: false, status: 409, json: async () => ({ success: false, message: 'Receipt already exists.' }) };
    await assert.rejects(operation(), /Receipt already exists/);
    response = { ok: true, json: async () => ({ success: false, message: 'Rejected mutation.', data: { _id: 'bill' } }) };
    await assert.rejects(operation(), /Rejected mutation/);
    response = { ok: true, json: async () => ({ success: true, data: null }) };
    await assert.rejects(operation(), /empty response/);
    response = { ok: true, json: async () => ({ success: true, data: { _id: 'bill', totalAmount: 123, deleted: true } }) };
    assert.equal((await operation())._id, 'bill');
  }
  console.log('PASS: create/update/delete reject HTTP conflicts, failed API responses and empty data; valid success is returned');
}
void run();
