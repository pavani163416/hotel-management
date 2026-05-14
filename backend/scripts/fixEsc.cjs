const fs = require('fs');
let c = fs.readFileSync('backend/controllers/managerController.js', 'utf8');

// Replace the broken esc function with a working one
const fixedEsc = 'function esc(s) {\n  return s.split("").map(function(ch) {\n    return "\\\\^$.|?*+()[]{}-".indexOf(ch) >= 0 ? "\\\\" + ch : ch;\n  }).join("");\n}';

c = c.replace(/function esc\(s\) \{[^\n]+\}/, fixedEsc);
fs.writeFileSync('backend/controllers/managerController.js', c, 'utf8');
console.log('Fixed esc function successfully');
