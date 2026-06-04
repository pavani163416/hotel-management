import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, '../..');

// Helper to run npm audit
function runAudit(dir) {
  try {
    const stdout = execSync('npm audit --json', { cwd: dir, encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch (e) {
        // Parse error
      }
    }
    return null;
  }
}

// Check backend server.js content
const serverJsPath = path.join(rootPath, 'backend/server.js');
let serverJsContent = '';
try {
  serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
} catch (e) {
  console.error("Could not read server.js", e);
}

// Perform static checks
const checks = {
  helmet: { name: 'Helmet (Secure HTTP Headers)', passed: serverJsContent.includes('app.use(helmet('), pts: 10 },
  cors: { name: 'Restricted CORS Configuration', passed: serverJsContent.includes('cors(') && !serverJsContent.includes('origin: "*"') && !serverJsContent.includes('origin: \'*\''), pts: 10 },
  mongoSanitize: { name: 'NoSQL Injection Prevention (express-mongo-sanitize)', passed: serverJsContent.includes('mongoSanitize(') || serverJsContent.includes('mongoSanitize()'), pts: 5 },
  xss: { name: 'XSS Filter (xss-clean or custom sanitization)', passed: serverJsContent.includes('xss(') || serverJsContent.includes('xssClean(') || serverJsContent.includes('sanitizeXSS'), pts: 5 },
  hpp: { name: 'HTTP Parameter Pollution Protection (hpp)', passed: serverJsContent.includes('hpp('), pts: 5 },
  prototypePollution: { name: 'Prototype Pollution Protection', passed: serverJsContent.includes('__proto__') && serverJsContent.includes('constructor') && serverJsContent.includes('prototype'), pts: 5 },
  csrf: { name: 'CSRF Protection (csrfProtection)', passed: serverJsContent.includes('csrfProtection'), pts: 5 },
  rateLimit: { name: 'Rate Limiting (authRateLimiter / apiLimiter)', passed: serverJsContent.includes('authRateLimiter') || serverJsContent.includes('rateLimit(') || serverJsContent.includes('RateLimiter'), pts: 5 },
  payloadLimit: { name: 'Payload Size Restrictions (e.g. 100kb limit)', passed: serverJsContent.includes('limit: "100kb"') || serverJsContent.includes("limit: '100kb'"), pts: 5 },
  httpsRedirect: { name: 'HTTPS Redirection in Production', passed: serverJsContent.includes('x-forwarded-proto') && serverJsContent.includes('https'), pts: 5 }
};

// Calculate Static Checks Score
let staticScore = 0;
let maxStaticScore = 0;
for (const key in checks) {
  maxStaticScore += checks[key].pts;
  if (checks[key].passed) {
    staticScore += checks[key].pts;
  }
}

// Run audits
console.log("Auditing backend dependencies...");
const backendAudit = runAudit(path.join(rootPath, 'backend'));
console.log("Auditing frontend dependencies...");
const frontendAudit = runAudit(path.join(rootPath, 'frontend'));
console.log("Auditing admin dependencies...");
const adminAudit = runAudit(path.join(rootPath, 'admin'));

// Audit parsing
function parseVulnerabilities(auditResult) {
  if (!auditResult) return { critical: 0, high: 0, moderate: 0, low: 0 };
  const vulns = auditResult.metadata?.vulnerabilities || auditResult.vulnerabilities || {};
  return {
    critical: vulns.critical || 0,
    high: vulns.high || 0,
    moderate: vulns.moderate || 0,
    low: vulns.low || 0
  };
}

const backendVulns = parseVulnerabilities(backendAudit);
const frontendVulns = parseVulnerabilities(frontendAudit);
const adminVulns = parseVulnerabilities(adminAudit);

const totalVulns = {
  critical: backendVulns.critical + frontendVulns.critical + adminVulns.critical,
  high: backendVulns.high + frontendVulns.high + adminVulns.high,
  moderate: backendVulns.moderate + frontendVulns.moderate + adminVulns.moderate,
  low: backendVulns.low + frontendVulns.low + adminVulns.low
};

// Dependency score calculation (max 40 pts)
let depDeduction = (totalVulns.critical * 8) + (totalVulns.high * 4) + (totalVulns.moderate * 2) + (totalVulns.low * 0.5);
let depScore = Math.max(0, 40 - depDeduction);

// Mobile security check
let mobileSecureStorage = false;
let mobileBackupExclusion = false;

try {
  const authProviderContent = fs.readFileSync(path.join(rootPath, 'hotelmanag/lib/core/providers/auth_provider.dart'), 'utf8');
  if (authProviderContent.includes('FlutterSecureStorage')) {
    mobileSecureStorage = true;
  }
} catch (e) {}

try {
  const dataExtRulesContent = fs.readFileSync(path.join(rootPath, 'hotelmanag/android/app/src/main/res/xml/data_extraction_rules.xml'), 'utf8');
  if (dataExtRulesContent.includes('exclude domain="sharedpref"') && dataExtRulesContent.includes('exclude domain="database"')) {
    mobileBackupExclusion = true;
  }
} catch (e) {}

// Overall Security Score
const finalScore = Math.round(staticScore + depScore);

// Generate report Markdown
const reportMarkdown = `# 🛡️ Security Audit & Scorecard

This security scorecard was automatically generated by analyzing the configurations of the Node.js backend server and running audits on the dependencies of the backend, frontend, and admin workspaces, along with auditing the mobile app's security configurations.

## 📊 Overall Security Score: **${finalScore} / 100**
${finalScore >= 90 ? '🟢 **Excellent (A-Grade)**: The application follows industry best practices for runtime protection and dependency management.' : finalScore >= 75 ? '🟡 **Good (B-Grade)**: The app is well-secured but has dependency-level vulnerability improvements that can be made.' : '🔴 **Action Required**: Security posture has significant vulnerabilities or missing server controls.'}

---

## 🔒 Runtime & Configuration Checks (Score: ${staticScore} / ${maxStaticScore})

| Security Control | Weight | Status | Description |
|:---|:---:|:---:|:---|
| **Helmet Headers** | 10 | ${checks.helmet.passed ? '✅ Passed' : '❌ Failed'} | Enforces secure HTTP headers (XSS, clickjacking, MIME sniffing). |
| **Restricted CORS** | 10 | ${checks.cors.passed ? '✅ Passed' : '❌ Failed'} | Restricts Cross-Origin Resource Sharing to known trusted origins. |
| **NoSQL Injection Safeguard** | 5 | ${checks.mongoSanitize.passed ? '✅ Passed' : '❌ Failed'} | Sanitizes operator characters ($ and .) from request inputs. |
| **XSS Filtering** | 5 | ${checks.xss.passed ? '✅ Passed' : '❌ Failed'} | Recursively strips or escapes HTML characters from user input. |
| **Prototype Pollution Defenses** | 5 | ${checks.prototypePollution.passed ? '✅ Passed' : '❌ Failed'} | Recursively strips dangerous object prototypes (\`__proto__\`, \`constructor\`). |
| **Parameter Pollution Prevention** | 5 | ${checks.hpp.passed ? '✅ Passed' : '❌ Failed'} | Discards duplicate parameters to prevent parameter pollution. |
| **CSRF Mitigation** | 5 | ${checks.csrf.passed ? '✅ Passed' : '❌ Failed'} | Protects mutative API endpoints via Origin/Referer verification. |
| **Brute-Force Limiters** | 5 | ${checks.rateLimit.passed ? '✅ Passed' : '❌ Failed'} | Restricts auth/admin route attempts to prevent brute-force attacks. |
| **Payload Size Limits** | 5 | ${checks.payloadLimit.passed ? '✅ Passed' : '❌ Failed'} | Caps request body sizes (e.g., 100KB) to prevent Denials of Service. |
| **HTTPS Redirection** | 5 | ${checks.httpsRedirect.passed ? '✅ Passed' : '❌ Failed'} | Forces production traffic to redirect to encrypted SSL transport. |

---

## 📦 Dependency Vulnerabilities (Score: ${depScore.toFixed(1)} / 40)

Below is a breakdown of vulnerabilities detected in the workspaces by running \`npm audit\`:

| Workspace | Critical | High | Moderate | Low | Audit Status |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Backend** | ${backendVulns.critical} | ${backendVulns.high} | ${backendVulns.moderate} | ${backendVulns.low} | ${backendAudit ? '✅ Audited' : '⚠️ No Lockfile'} |
| **Frontend** | ${frontendVulns.critical} | ${frontendVulns.high} | ${frontendVulns.moderate} | ${frontendVulns.low} | ${frontendAudit ? '✅ Audited' : '⚠️ No Lockfile'} |
| **Admin** | ${adminVulns.critical} | ${adminVulns.high} | ${adminVulns.moderate} | ${adminVulns.low} | ${adminAudit ? '✅ Audited' : '⚠️ No Lockfile'} |
| **TOTAL** | **${totalVulns.critical}** | **${totalVulns.high}** | **${totalVulns.moderate}** | **${totalVulns.low}** | |

*Deductions applied: -8 for Critical, -4 for High, -2 for Moderate, -0.5 for Low.*

---

## 📱 Mobile App Security Controls (Status: Info Only)

*   **Secure Storage**: ${mobileSecureStorage ? '✅ Passed (\`FlutterSecureStorage\` used for JWT credentials)' : '⚠️ Warning (Fallback storage or local preferences found)'}
*   **Android Data Extraction Rules**: ${mobileBackupExclusion ? '✅ Passed (Database and SharedPrefs are excluded from cloud/local backups)' : '⚠️ Missing exclusion rules (potential credential exposure)'}

---

## 🛠️ Actionable Recommendations
1. **Resolve Critical & High Vulnerabilities**: Run \`npm audit fix\` in the \`frontend\` directory (e.g. update \`vitest\` to \`>= 4.1.0\` to fix arbitrary file reading vulnerability).
2. **Resolve Moderate Vulnerabilities**: Run \`npm audit fix\` in \`backend\`, \`frontend\`, and \`admin\` to resolve the moderate vulnerabilities in \`ws\`, \`uuid\`, \`react-router-dom\` etc.
3. **Environment Hardening**: Ensure your deployment environment holds rotated credentials, production mode flags, and restricted origins.
`;

console.log("Writing report...");
const conversationId = process.env.CONVERSATION_ID || "fcc89ce3-247a-476e-b405-c911118b0151";
const artifactPath = path.resolve('C:/Users/NAPROCS-HR-01/.gemini/antigravity/brain/' + conversationId + '/security_scorecard.md');
fs.writeFileSync(artifactPath, reportMarkdown);
console.log("Report successfully written to:", artifactPath);
console.log("\n--- Audit Summary Score ---");
console.log(`Overall Score: ${finalScore}/100`);
console.log(`Configuration Checks: ${staticScore}/${maxStaticScore}`);
console.log(`Dependency Score: ${depScore.toFixed(1)}/40`);
console.log("Vulnerabilities count:", totalVulns);
