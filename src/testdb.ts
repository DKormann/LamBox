import { saveLambda, getLambda, getAllLambdas, deleteLambda } from './sqliteStore';

const hash = 'abc123';
const code = `function hello() { console.log("Hello from DB!"); }`;

console.log('--- Save Function ---');
saveLambda(hash, code);

console.log('--- Get Function ---');
const loaded = getLambda(hash);
console.log('Lambda caricata:', loaded);

console.log(getAllLambdas());
