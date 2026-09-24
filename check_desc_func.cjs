const fs = require('fs');
const html = fs.readFileSync('scratch_bage_page.html', 'utf8');

// Read html-parser-utils.ts to see what extractFullPropertyDescription does
const utils = fs.readFileSync('src/features/website-import/utils/html-parser-utils.ts', 'utf8');
const descFuncStart = utils.indexOf('export function extractFullPropertyDescription');
console.log(utils.substring(descFuncStart, descFuncStart + 1500));
