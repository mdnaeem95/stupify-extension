/**
 * Bundle Analysis Script
 * 
 * Analyzes the built extension bundle to:
 * - Report bundle sizes
 * - Identify large dependencies
 * - Suggest optimizations
 * - Generate size reports
 * 
 * Usage: node analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Size thresholds
const THRESHOLDS = {
  CRITICAL: 500 * 1024, // 500KB
  WARNING: 200 * 1024,  // 200KB
  GOOD: 150 * 1024,     // 150KB
};

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get size with color
function getSizeWithColor(size, gzipped) {
  const bytes = gzipped || size;
  let color = colors.green;
  
  if (bytes > THRESHOLDS.CRITICAL) {
    color = colors.red;
  } else if (bytes > THRESHOLDS.WARNING) {
    color = colors.yellow;
  }

  return `${color}${formatBytes(size)}${colors.reset}` + 
    (gzipped ? ` (${formatBytes(gzipped)} gzipped)` : '');
}

// Get file size
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content).length;
    
    return {
      size: stats.size,
      gzipped,
    };
  } catch (error) {
    return { size: 0, gzipped: 0 };
  }
}

// Analyze directory recursively
function analyzeDirectory(dirPath, relativePath = '') {
  const results = [];
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const relPath = path.join(relativePath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        results.push(...analyzeDirectory(filePath, relPath));
      } else {
        const { size, gzipped } = getFileSize(filePath);
        results.push({
          path: relPath,
          size,
          gzipped,
          type: path.extname(file),
        });
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${dirPath}:`, error.message);
  }
  
  return results;
}

// Group files by type
function groupByType(files) {
  const groups = {};
  
  for (const file of files) {
    const type = file.type || 'other';
    if (!groups[type]) {
      groups[type] = {
        files: [],
        totalSize: 0,
        totalGzipped: 0,
      };
    }
    
    groups[type].files.push(file);
    groups[type].totalSize += file.size;
    groups[type].totalGzipped += file.gzipped;
  }
  
  return groups;
}

// Find largest files
function findLargestFiles(files, count = 10) {
  return [...files]
    .sort((a, b) => b.gzipped - a.gzipped)
    .slice(0, count);
}

// Generate report
function generateReport(distPath) {
  console.log(`\n${colors.bright}${colors.cyan}📦 BUNDLE ANALYSIS REPORT${colors.reset}\n`);
  console.log(`Analyzing: ${distPath}\n`);
  
  // Analyze all files
  const files = analyzeDirectory(distPath);
  
  if (files.length === 0) {
    console.log(`${colors.red}❌ No files found. Did you run 'npm run build'?${colors.reset}\n`);
    return;
  }
  
  // Calculate totals
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalGzipped = files.reduce((sum, f) => sum + f.gzipped, 0);
  
  // Print total size
  console.log(`${colors.bright}Total Bundle Size:${colors.reset}`);
  console.log(`  Raw:     ${getSizeWithColor(totalSize)}`);
  console.log(`  Gzipped: ${getSizeWithColor(totalSize, totalGzipped)}`);
  
  // Status check
  if (totalGzipped > THRESHOLDS.CRITICAL) {
    console.log(`\n  ${colors.red}❌ CRITICAL: Bundle exceeds 500KB!${colors.reset}`);
  } else if (totalGzipped > THRESHOLDS.WARNING) {
    console.log(`\n  ${colors.yellow}⚠️  WARNING: Bundle exceeds 200KB target${colors.reset}`);
  } else if (totalGzipped > THRESHOLDS.GOOD) {
    console.log(`\n  ${colors.yellow}⚠️  GOOD: Close to 150KB optimal size${colors.reset}`);
  } else {
    console.log(`\n  ${colors.green}✅ EXCELLENT: Under 150KB optimal size!${colors.reset}`);
  }
  
  // Group by file type
  console.log(`\n${colors.bright}By File Type:${colors.reset}`);
  const groups = groupByType(files);
  
  for (const [type, group] of Object.entries(groups)) {
    console.log(`\n  ${colors.cyan}${type || 'other'}${colors.reset} (${group.files.length} files)`);
    console.log(`    ${getSizeWithColor(group.totalSize, group.totalGzipped)}`);
  }
  
  // Largest files
  console.log(`\n${colors.bright}Top 10 Largest Files:${colors.reset}\n`);
  const largest = findLargestFiles(files, 10);
  
  largest.forEach((file, index) => {
    const num = `${index + 1}.`.padEnd(4);
    const size = getSizeWithColor(file.size, file.gzipped);
    console.log(`  ${num}${file.path}`);
    console.log(`      ${size}`);
  });
  
  // Recommendations
  console.log(`\n${colors.bright}Recommendations:${colors.reset}\n`);
  
  if (totalGzipped > THRESHOLDS.WARNING) {
    console.log(`  ${colors.yellow}1. Consider code splitting for large components${colors.reset}`);
    console.log(`  ${colors.yellow}2. Lazy load heavy features${colors.reset}`);
    console.log(`  ${colors.yellow}3. Check for duplicate dependencies${colors.reset}`);
  }
  
  // Check for large JS files
  const largeJS = files.filter(f => f.type === '.js' && f.gzipped > 50 * 1024);
  if (largeJS.length > 0) {
    console.log(`  ${colors.yellow}4. Found ${largeJS.length} JS files >50KB - consider splitting${colors.reset}`);
  }
  
  // Check for unoptimized images
  const images = files.filter(f => ['.png', '.jpg', '.jpeg', '.gif'].includes(f.type));
  const largeImages = images.filter(f => f.size > 100 * 1024);
  if (largeImages.length > 0) {
    console.log(`  ${colors.yellow}5. Found ${largeImages.length} images >100KB - compress them${colors.reset}`);
  }
  
  if (totalGzipped < THRESHOLDS.GOOD) {
    console.log(`  ${colors.green}✅ Bundle is well optimized!${colors.reset}`);
  }
  
  console.log('');
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    totalSize,
    totalGzipped,
    fileCount: files.length,
    groups,
    largestFiles: largest,
    files,
  };
  
  const reportPath = path.join(distPath, 'bundle-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`${colors.green}✅ Detailed report saved to: ${reportPath}${colors.reset}\n`);
}

// Main
const distPath = path.join(process.cwd(), 'dist');

if (!fs.existsSync(distPath)) {
  console.log(`${colors.red}❌ dist/ folder not found. Run 'npm run build' first.${colors.reset}\n`);
  process.exit(1);
}

generateReport(distPath);