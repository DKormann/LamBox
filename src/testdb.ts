import { saveLambda, getLambda } from './sqliteStore.js';

const hash = 'abc123';
const code = `function hello() { console.log("Hello from DB!"); }`;

console.log('--- Save Function ---');
saveLambda(hash, code);

console.log('--- Get Function ---');
const loaded = getLambda(hash);
console.log('Lambda loaded:', loaded);
