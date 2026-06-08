const fs = require('fs');
const path = require('path');
const libPath = 'c:/src/Hotel_Management/hotelmanag/lib';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.dart')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(libPath);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const regex = /'\\\$(\$\{[^}]+\})([^']*)'/g;
  content = content.replace(regex, (match, p1, p2) => {
    changed = true;
    let inner = p1.replace(/^\$\{/, '').replace(/\}$/, '');
    
    const nfMatch = inner.match(/NumberFormat\([^)]+\)\.format\(([^)]+)\)/);
    if (nfMatch) inner = nfMatch[1];
    else if (inner.endsWith('.toInt()')) inner = inner.replace('.toInt()', '');
    
    if (p2) {
      return "'${context.read<CurrencyProvider>().format(" + inner + ")}" + p2 + "'";
    } else {
      return "context.read<CurrencyProvider>().format(" + inner + ")";
    }
  });

  const regex2 = /'-\\\$(\$\{[^}]+\})'/g;
  content = content.replace(regex2, (match, p1) => {
    changed = true;
    let inner = p1.replace(/^\$\{/, '').replace(/\}$/, '');
    const nfMatch = inner.match(/NumberFormat\([^)]+\)\.format\(([^)]+)\)/);
    if (nfMatch) inner = nfMatch[1];
    else if (inner.endsWith('.toInt()')) inner = inner.replace('.toInt()', '');
    
    return "'-' + context.read<CurrencyProvider>().format(" + inner + ")";
  });
  
  const regex3 = /'Pay \\\$(\$\{[^}]+\})'/g;
  content = content.replace(regex3, (match, p1) => {
    changed = true;
    let inner = p1.replace(/^\$\{/, '').replace(/\}$/, '');
    const nfMatch = inner.match(/NumberFormat\([^)]+\)\.format\(([^)]+)\)/);
    if (nfMatch) inner = nfMatch[1];
    else if (inner.endsWith('.toInt()')) inner = inner.replace('.toInt()', '');
    
    return "'Pay ${context.read<CurrencyProvider>().format(" + inner + ")}'";
  });

  if (changed) {
    if (!content.includes('currency_provider.dart')) {
       const depth = file.substring(libPath.length).split(path.sep).length - 2;
       const prefix = depth > 0 ? '../'.repeat(depth) : './';
       const importLine = "import '" + prefix + "core/providers/currency_provider.dart';\n";
       content = content.replace(/import [^;]+;\n/, match => match + importLine);
    }
    fs.writeFileSync(file, content);
  }
});
console.log('Done');
