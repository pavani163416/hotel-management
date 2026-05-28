const fs = require('fs');
const path = require('path');
const pkgs = new Set();
const scan = (dir) => {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && f !== 'node_modules') scan(p);
    else if (f.endsWith('.js')) {
      const c = fs.readFileSync(p, 'utf8');
      const m1 = [...c.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g)];
      const m2 = [...c.matchAll(/import\s*\(['"]([^'"]+)['"]\)/g)];
      const m3 = [...c.matchAll(/require\(['"]([^'"]+)['"]\)/g)];
      [...m1, ...m2, ...m3].forEach(match => {
        const name = match[1];
        if (!name.startsWith('.') && !name.startsWith('/')) {
          const pkg = name.split('/')[name.startsWith('@') ? 1 : 0];
          pkgs.add(name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : pkg);
        }
      });
    }
  });
};
scan('.');
console.log([...pkgs].sort().join('\n'));
