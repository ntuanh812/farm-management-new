const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Function to replace with padded ID
  const replaceWithPadded = (match, p1) => {
    return `PGI${String(p1).padStart(3, '0')}`;
  };

  const replaceWithPaddedCurly = (match, p1) => {
    return `PIG{String(p1).padStart(3, '0')}`;
  };

  content = content.replace(/Lợn số \$\{([^}]+)\}/gi, replaceWithPadded);
  content = content.replace(/Lợn số \{([^}]+)\}/gi, replaceWithPaddedCurly);
  content = content.replace(/Lợn số/gi, "PIG");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(process.cwd(), 'frontend', 'src'));