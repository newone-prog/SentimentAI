const fs = require('fs');
const path = require('path');
const types = ['AgentInput', 'BaseAgentResponse', 'ResearchContext', 'SourceMetadata', 'RawSource', 'DevilsAdvocateReport', 'NarrativeReport', 'OmissionReport', 'ResearchReport', 'JudgeReport', 'Evidence'];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, fromPath) => {
        const importParts = imports.split(',').map(i => i.trim()).filter(Boolean);
        const normalImports = [];
        const typeImports = [];
        importParts.forEach(i => {
          if (types.includes(i)) typeImports.push(i);
          else normalImports.push(i);
        });
        if (typeImports.length === 0) return match;
        changed = true;
        let res = '';
        if (normalImports.length > 0) res += `import { ${normalImports.join(', ')} } from '${fromPath}';\n`;
        res += `import type { ${typeImports.join(', ')} } from '${fromPath}'`;
        return res;
      });
      if (changed) fs.writeFileSync(fullPath, content);
    }
  }
}
processDir('src/lib/orchestrator');
