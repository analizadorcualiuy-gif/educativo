const fs = require('fs');
const content = fs.readFileSync('web-beta/educational.js', 'utf8');

const casesMatch = content.match(/const educationalCases = (\{[\s\S]*?\n\};)/);
const educationalCases = (new Function('return ' + casesMatch[1]))();

const ipesDoc = educationalCases.jornadas_ipes.documents[0];
const text = ipesDoc[1];
const words = text.trim().split(/\s+/).length;
const chars = text.length;

console.log('Doc title:', ipesDoc[0]);
console.log('Total words:', words);
console.log('Total chars:', chars);
console.log('--- START (250 chars) ---');
console.log(text.slice(0, 250));
console.log('--- END (250 chars) ---');
console.log(text.slice(-250));
