import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const env = args[0] || "local"; // 'local', 'staging', 'production'
const varsFile = args[1] || ".dev.vars";

const WRANGLER_JSONC_PATH = path.resolve(process.cwd(), "wrangler.jsonc");
const DEV_VARS_PATH = path.resolve(process.cwd(), varsFile);

console.log(`Generating wrangler.json for environment: ${env}`);

// Determine output paths
// For CI/CD: generate in build/server (where wrangler looks for it)
// For local: generate in root
const BUILD_SERVER_PATH = path.resolve(process.cwd(), "build/server");
const WRANGLER_JSON_ROOT = path.resolve(process.cwd(), "wrangler.json");
const WRANGLER_JSON_BUILD = path.resolve(BUILD_SERVER_PATH, "wrangler.json");

// 1. Read wrangler.jsonc
let content = fs.readFileSync(WRANGLER_JSONC_PATH, "utf-8");

// Remove JSONC comments while preserving strings
// We need to parse character by character to avoid removing // inside strings
function stripJsonComments(jsonc) {
  let result = "";
  let inString = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let escapeNext = false;

  for (let i = 0; i < jsonc.length; i++) {
    const char = jsonc[i];
    const nextChar = jsonc[i + 1];

    // Handle escape sequences in strings
    if (inString && escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (inString && char === "\\") {
      result += char;
      escapeNext = true;
      continue;
    }

    // Toggle string state
    if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
      inString = !inString;
      result += char;
      continue;
    }

    // Skip if we're in a string
    if (inString) {
      result += char;
      continue;
    }

    // Handle multi-line comment end
    if (inMultiLineComment) {
      if (char === "*" && nextChar === "/") {
        inMultiLineComment = false;
        i++; // Skip the '/'
      }
      continue;
    }

    // Handle single-line comment end
    if (inSingleLineComment) {
      if (char === "\n" || char === "\r") {
        inSingleLineComment = false;
        result += char; // Preserve the newline
      }
      continue;
    }

    // Check for comment starts
    if (char === "/") {
      if (nextChar === "/") {
        inSingleLineComment = true;
        i++; // Skip the second '/'
        continue;
      }
      if (nextChar === "*") {
        inMultiLineComment = true;
        i++; // Skip the '*'
        continue;
      }
    }

    // Regular character
    result += char;
  }

  return result;
}

content = stripJsonComments(content);

// Remove trailing commas before closing braces/brackets
content = content.replace(/,(\s*[}\]])/g, "$1");

// 2. Extract placeholders
const placeholderRegex = /\$\{([A-Z0-9_]+)\}/g;
const placeholders = new Set();
let match = placeholderRegex.exec(content);
while (match !== null) {
  placeholders.add(match[1]);
  match = placeholderRegex.exec(content);
}

// 3. Resolve values
const vars = {};

if (env === "local") {
  if (fs.existsSync(DEV_VARS_PATH)) {
    const devVarsContent = fs.readFileSync(DEV_VARS_PATH, "utf-8");
    devVarsContent.split("\n").forEach((line) => {
      // Trim the line
      line = line.trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("#")) {
        return;
      }

      const equalIndex = line.indexOf("=");
      if (equalIndex === -1) {
        return; // Skip lines without '='
      }

      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();

      if (key) {
        vars[key] = value;
      }
    });
  } else {
    console.warn(
      ".dev.vars file not found. Placeholders might not be resolved.",
    );
  }
} else {
  // CI/CD: Read from process.env
  // Priority: {ENV}_{KEY} -> {KEY}
  // e.g., STAGING_KV_ID -> KV_ID
  const prefix = `${env.toUpperCase()}_`;

  console.log(`Looking for environment variables with prefix: ${prefix}`);
  console.log(`Placeholders found: ${Array.from(placeholders).join(", ")}`);

  placeholders.forEach((key) => {
    const envKeyWithPrefix = prefix + key;
    let value = process.env[envKeyWithPrefix] || process.env[key];

    // Validate value
    if (value) {
      value = value.trim();
      // Check for invalid/dummy values
      if (
        value === "" ||
        value === "***" ||
        value === "PLACEHOLDER" ||
        value.includes("***")
      ) {
        console.warn(`⚠ Ignoring invalid value for ${key}: "${value}"`);
        value = undefined;
      }
    }

    if (value) {
      vars[key] = value;
      console.log(`✓ Found ${key} (value length: ${value.length})`);
    } else {
      console.warn(`✗ Missing: ${envKeyWithPrefix} or ${key}`);
    }
  });

  console.log(
    `Total variables resolved: ${Object.keys(vars).length}/${placeholders.size}`,
  );
}

// 4. Replace placeholders
function escapeJsonString(str) {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t") // Escape tabs
    .replace(/\f/g, "\\f"); // Escape form feeds
}

let finalContent = content;
const unresolvedPlaceholders = new Set();

placeholders.forEach((key) => {
  const value = vars[key];
  if (value !== undefined) {
    // Escape the value to ensure it's valid JSON
    const escapedValue = escapeJsonString(value);
    // We use a global replace
    finalContent = finalContent.split(`\${${key}}`).join(escapedValue);
  } else {
    console.warn(`Warning: Variable ${key} not found for environment ${env}`);
    unresolvedPlaceholders.add(key);
  }
});

// 4.5. Remove bindings with unresolved placeholders
if (unresolvedPlaceholders.size > 0) {
  console.log(
    `\nRemoving bindings with unresolved placeholders: ${Array.from(unresolvedPlaceholders).join(", ")}`,
  );

  try {
    const config = JSON.parse(finalContent);

    // Generic function to check for unresolved placeholders in a binding
    // This checks both the original unresolved set AND any remaining ${...} patterns
    const hasUnresolvedPlaceholder = (binding) => {
      const bindingString = JSON.stringify(binding);

      // Check if it contains any of our known unresolved placeholders
      for (const placeholder of unresolvedPlaceholders) {
        if (bindingString.includes(`\${${placeholder}}`)) {
          return true;
        }
      }

      // Also check for any remaining ${...} pattern (catch-all)
      // This handles cases where the placeholder might have been partially processed
      if (bindingString.match(/\$\{[A-Z0-9_]+\}/)) {
        return true;
      }

      return false;
    };

    // Remove KV namespaces with unresolved placeholders
    if (config.kv_namespaces) {
      const originalLength = config.kv_namespaces.length;
      config.kv_namespaces = config.kv_namespaces.filter((kv) => {
        const hasUnresolved = hasUnresolvedPlaceholder(kv);
        if (hasUnresolved) {
          console.log(
            `  ✗ Removed KV namespace binding: ${kv.binding} (id: ${kv.id})`,
          );
        }
        return !hasUnresolved;
      });
      if (config.kv_namespaces.length === 0) {
        delete config.kv_namespaces;
        console.log(
          `  ℹ Removed entire kv_namespaces section (${originalLength} bindings removed)`,
        );
      }
    }

    // Remove D1 databases with unresolved placeholders
    if (config.d1_databases) {
      const originalLength = config.d1_databases.length;
      config.d1_databases = config.d1_databases.filter((d1) => {
        const hasUnresolved = hasUnresolvedPlaceholder(d1);
        if (hasUnresolved) {
          console.log(
            `  ✗ Removed D1 database binding: ${d1.binding} (database_id: ${d1.database_id})`,
          );
        }
        return !hasUnresolved;
      });
      if (config.d1_databases.length === 0) {
        delete config.d1_databases;
        console.log(
          `  ℹ Removed entire d1_databases section (${originalLength} bindings removed)`,
        );
      }
    }

    // Remove Hyperdrive configs with unresolved placeholders
    if (config.hyperdrive) {
      const originalLength = config.hyperdrive.length;
      config.hyperdrive = config.hyperdrive.filter((hd) => {
        const hasUnresolved = hasUnresolvedPlaceholder(hd);
        if (hasUnresolved) {
          console.log(
            `  ✗ Removed Hyperdrive binding: ${hd.binding} (id: ${hd.id})`,
          );
        }
        return !hasUnresolved;
      });
      if (config.hyperdrive.length === 0) {
        delete config.hyperdrive;
        console.log(
          `  ℹ Removed entire hyperdrive section (${originalLength} bindings removed)`,
        );
      }
    }

    // Remove Vectorize indexes with unresolved placeholders
    if (config.vectorize) {
      const originalLength = config.vectorize.length;
      config.vectorize = config.vectorize.filter((vz) => {
        const hasUnresolved = hasUnresolvedPlaceholder(vz);
        if (hasUnresolved) {
          console.log(
            `  ✗ Removed Vectorize binding: ${vz.binding} (index_name: ${vz.index_name})`,
          );
        }
        return !hasUnresolved;
      });
      if (config.vectorize.length === 0) {
        delete config.vectorize;
        console.log(
          `  ℹ Removed entire vectorize section (${originalLength} bindings removed)`,
        );
      }
    }

    // Remove environment variables with unresolved placeholders
    if (config.vars) {
      const originalKeys = Object.keys(config.vars);
      Object.keys(config.vars).forEach((key) => {
        const value = config.vars[key];
        if (
          typeof value === "string" &&
          value.startsWith("${") &&
          value.endsWith("}")
        ) {
          const placeholder = value.slice(2, -1);
          if (unresolvedPlaceholders.has(placeholder)) {
            console.log(
              `  ✗ Removed environment variable: ${key} (value: ${value})`,
            );
            delete config.vars[key];
          }
        }
      });
      if (Object.keys(config.vars).length === 0) {
        delete config.vars;
        console.log(
          `  ℹ Removed entire vars section (${originalKeys.length} variables removed)`,
        );
      }
    }

    finalContent = JSON.stringify(config, null, 2);
    console.log("✓ Cleaned up bindings with unresolved placeholders\n");
  } catch (e) {
    console.error(
      "Warning: Could not parse JSON to remove unresolved bindings:",
      e.message,
    );
  }
}

// 5. Write wrangler.json
try {
  // Validate JSON before writing
  JSON.parse(finalContent);

  // Write to root directory (for local dev and as source)
  fs.writeFileSync(WRANGLER_JSON_ROOT, finalContent);
  console.log(`✓ Generated ${WRANGLER_JSON_ROOT}`);

  // Write to build/server directory if it exists (for deployment)
  if (fs.existsSync(BUILD_SERVER_PATH)) {
    // Parse the JSON to adjust paths for build/server location
    const buildConfig = JSON.parse(finalContent);

    // Check what files exist in build/server
    const buildServerFiles = fs.readdirSync(BUILD_SERVER_PATH);
    console.log(`Files in build/server: ${buildServerFiles.join(", ")}`);

    // Find the actual entry point (usually index.js)
    const entryPoint =
      buildServerFiles.find((f) => f === "index.js") || "./index.js";

    // Update paths for build/server context
    if (buildConfig.main) {
      buildConfig.main = entryPoint;
      console.log(`Updated main entry point to: ${entryPoint}`);
    }

    // Update assets directory path (if it exists)
    if (buildConfig.assets?.directory) {
      // From build/server, the client assets are at ../client
      buildConfig.assets.directory = "../client";
      console.log(`Updated assets directory to: ../client`);
    }

    const buildServerContent = JSON.stringify(buildConfig, null, 2);
    fs.writeFileSync(WRANGLER_JSON_BUILD, buildServerContent);
    console.log(`✓ Generated ${WRANGLER_JSON_BUILD}`);
  } else {
    console.log(
      `ℹ build/server directory not found, skipping ${WRANGLER_JSON_BUILD}`,
    );
  }

  console.log("Successfully generated wrangler.json");
} catch (e) {
  console.error("Error: Generated content is not valid JSON.");
  console.error(e);
  console.log("--- Generated Content ---");
  console.log(finalContent);
  process.exit(1);
}
