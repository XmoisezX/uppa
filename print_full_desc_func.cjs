const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Let's read extractFullPropertyDescription completely
const utils = fs.readFileSync('src/features/website-import/utils/html-parser-utils.ts', 'utf8');
const descFuncStart = utils.indexOf('export function extractFullPropertyDescription');
const descFuncEnd = utils.indexOf('export function inferTransactionType');
console.log(utils.substring(descFuncStart, descFuncEnd));
