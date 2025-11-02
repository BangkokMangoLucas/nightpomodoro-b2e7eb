#!/usr/bin/env node

/**
 * Static export validation script
 * Checks for SSR/ISR/Edge/API routes and other static export violations
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

// Patterns to detect violations
const VIOLATIONS = {
  SSR: [
    /getServerSideProps/,
    /export\s+async\s+function\s+getServerSideProps/,
  ],
  ISR: [
    /getStaticProps.*revalidate/,
    /export\s+const\s+revalidate\s*=/,
  ],
  SERVER_ACTIONS: [
    /"use server"/,
    /export\s+async\s+function\s+\w+\s*\(.*\)\s*\{[\s\S]*"use server"/,
  ],
  API_ROUTES: [],
  SERVER_ONLY: [
    /import.*['"]server-only['"]/,
    /from\s+['"]server-only['"]/,
  ],
  DYNAMIC_FORCED: [
    /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/,
  ],
  SERVER_HEADERS: [
    /import.*\{.*cookies.*\}.*from\s+['"]next\/headers['"]/,
    /import.*\{.*headers.*\}.*from\s+['"]next\/headers['"]/,
  ],
};

const errors = [];
const warnings = [];

// Recursively scan directory
function scanDirectory(dir, baseDir = ROOT_DIR) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = fullPath.replace(baseDir + "/", "");

    // Skip node_modules, .next, out
    if (
      relativePath.includes("node_modules") ||
      relativePath.includes("/.next/") ||
      relativePath.includes("/out/") ||
      relativePath.includes("/.git/")
    ) {
      continue;
    }

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Check for API routes directory
      if (entry === "api" && (dir.includes("/app/") || dir.includes("/pages/"))) {
        errors.push({
          type: "API_ROUTES",
          path: relativePath,
          message: "API routes directory found (not compatible with static export)",
        });
      }
      scanDirectory(fullPath, baseDir);
    } else if (stat.isFile()) {
      // Only check TypeScript/JavaScript files
      const ext = extname(fullPath);
      if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) continue;

      const content = readFileSync(fullPath, "utf8");

      // Check for violations
      for (const [type, patterns] of Object.entries(VIOLATIONS)) {
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            errors.push({
              type,
              path: relativePath,
              message: `Found ${type} violation: ${pattern}`,
            });
          }
        }
      }

      // Check for dynamic routes without generateStaticParams
      if (relativePath.includes("/[") && relativePath.includes("]/")) {
        const dirPath = dirname(fullPath);
        const hasGenerateStaticParams = content.includes("generateStaticParams");
        
        if (!hasGenerateStaticParams) {
          warnings.push({
            type: "DYNAMIC_ROUTE",
            path: relativePath,
            message: "Dynamic route without generateStaticParams (may fail at build)",
          });
        }
      }
    }
  }
}

// Check next.config.ts
function checkNextConfig() {
  const configPath = join(ROOT_DIR, "next.config.ts");
  try {
    const content = readFileSync(configPath, "utf8");

    if (!content.includes('output: "export"') && !content.includes("output:'export'")) {
      errors.push({
        type: "CONFIG",
        path: "next.config.ts",
        message: 'Missing output: "export" in next.config.ts',
      });
    }

    if (!content.includes("unoptimized: true")) {
      warnings.push({
        type: "CONFIG",
        path: "next.config.ts",
        message: "images.unoptimized should be true for static export",
      });
    }

    if (!content.includes("trailingSlash: true")) {
      warnings.push({
        type: "CONFIG",
        path: "next.config.ts",
        message: "trailingSlash: true recommended for static export",
      });
    }
  } catch (error) {
    errors.push({
      type: "CONFIG",
      path: "next.config.ts",
      message: "Cannot read next.config.ts",
    });
  }
}

// Run checks
console.log("🔍 Checking for static export violations...\n");

checkNextConfig();
scanDirectory(join(ROOT_DIR, "app"));
if (existsSync(join(ROOT_DIR, "pages"))) {
  scanDirectory(join(ROOT_DIR, "pages"));
}

// Report results
if (errors.length > 0) {
  console.error("❌ ERRORS FOUND:\n");
  for (const error of errors) {
    console.error(`  [${error.type}] ${error.path}`);
    console.error(`    ${error.message}\n`);
  }
}

if (warnings.length > 0) {
  console.warn("⚠️  WARNINGS:\n");
  for (const warning of warnings) {
    console.warn(`  [${warning.type}] ${warning.path}`);
    console.warn(`    ${warning.message}\n`);
  }
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("✅ No static export violations found!");
  process.exit(0);
} else if (errors.length === 0) {
  console.log(`\n✅ No critical errors (${warnings.length} warnings)`);
  process.exit(0);
} else {
  console.error(`\n❌ Found ${errors.length} errors and ${warnings.length} warnings`);
  process.exit(1);
}

// Helper to check if directory exists
function existsSync(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

