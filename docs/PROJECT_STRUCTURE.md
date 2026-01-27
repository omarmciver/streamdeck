# Project Structure Documentation

## Overview

This document provides a comprehensive breakdown of the Stream Deck Tools plugin directory structure, file purposes, and organizational patterns.

## Directory Tree

```
streamdeck/
├── .claude/                              # Claude AI configuration
│   └── (SuperClaude framework files)
│
├── .git/                                 # Git version control
│
├── .vscode/                              # VS Code workspace settings
│   └── settings.json
│
├── com.omar-mciver.tools.sdPlugin/      # Plugin package (distributable)
│   ├── bin/                             # Compiled output (generated)
│   │   ├── plugin.js                    # Bundled plugin code
│   │   └── package.json                 # ESM marker
│   │
│   ├── imgs/                            # Plugin assets
│   │   ├── plugin/                      # Plugin-level icons
│   │   │   ├── marketplace@2x.png       # Store listing icon (288x288)
│   │   │   └── category-icon@2x.png     # Category icon (56x56)
│   │   │
│   │   └── actions/                     # Action-specific icons
│   │       └── counter/                 # IfConfigInfo action icons
│   │           ├── icon@2x.png          # Action list icon (144x144)
│   │           └── none@2x.png          # Key default state (144x144)
│   │
│   ├── logs/                            # Runtime logs (generated)
│   │   ├── plugin.log                   # Current session log
│   │   └── plugin.log.1                 # Previous session log
│   │
│   ├── ui/                              # Property Inspector UI
│   │   └── increment-counter.html       # Settings UI for IfConfigInfo
│   │
│   └── manifest.json                    # Plugin metadata and configuration
│
├── docs/                                # Project documentation
│   ├── ARCHITECTURE.md                  # System design and architecture
│   ├── API_REFERENCE.md                 # API documentation
│   ├── DEVELOPMENT_GUIDE.md             # Developer workflow guide
│   ├── PROJECT_STRUCTURE.md             # This file
│   └── TROUBLESHOOTING.md               # Issue resolution guide
│
├── node_modules/                        # NPM dependencies (generated)
│
├── src/                                 # Source code (TypeScript)
│   ├── actions/                         # Action implementations
│   │   └── ifconfig-info.ts             # IP address action
│   │
│   └── plugin.ts                        # Plugin entry point
│
├── .editorconfig                        # Editor formatting rules
├── .gitignore                           # Git ignore patterns
├── package.json                         # NPM configuration
├── pnpm-lock.yaml                       # Dependency lock file
├── README.md                            # Project overview
├── rollup.config.mjs                    # Build configuration
└── tsconfig.json                        # TypeScript configuration
```

---

## Core Directories

### `/src/` - Source Code

**Purpose:** TypeScript source code before compilation

**Contents:**
- `plugin.ts` - Main entry point, SDK initialization, action registration
- `actions/` - Individual action implementations

**Build Process:**
- TypeScript → ES2022
- Rollup bundling → Single output file
- Terser minification (production)

**Development:**
- Edit files in this directory
- Watch mode monitors for changes
- Automatic rebuild on save

---

### `/com.omar-mciver.tools.sdPlugin/` - Plugin Package

**Purpose:** Complete distributable plugin package

**Structure:** Follows Elgato Stream Deck plugin specification

**Key Files:**
- `manifest.json` - Plugin metadata (name, version, actions, platform requirements)
- `bin/plugin.js` - Compiled and bundled JavaScript
- `imgs/` - All visual assets
- `ui/` - Property Inspector HTML pages

**Distribution:**
- This directory is the complete plugin
- Can be zipped for distribution
- Stream Deck reads directly from this structure

---

### `/docs/` - Documentation

**Purpose:** Comprehensive project documentation

**Organization:**
- **README.md** (root) - Quick start and overview
- **ARCHITECTURE.md** - System design, data flow, component architecture
- **API_REFERENCE.md** - Detailed API documentation for all actions and settings
- **DEVELOPMENT_GUIDE.md** - Workflows, patterns, and development best practices
- **PROJECT_STRUCTURE.md** (this file) - Directory and file organization
- **TROUBLESHOOTING.md** - Common issues and solutions

**Maintenance:**
- Update alongside code changes
- Keep examples current
- Cross-reference between documents

---

### `/node_modules/` - Dependencies (Generated)

**Purpose:** NPM package dependencies

**Key Dependencies:**
- `@elgato/streamdeck` - Stream Deck SDK
- `@elgato/cli` - Command-line tools
- `typescript` - TypeScript compiler
- `rollup` - Build bundler

**Management:**
- Installed via `pnpm install`
- Version locked in `pnpm-lock.yaml`
- Not committed to Git (.gitignore)

---

## Key Files

### `/package.json` - NPM Configuration

**Purpose:** Project metadata, dependencies, and scripts

**Critical Sections:**

```json
{
    "scripts": {
        "build": "rollup -c",
        "watch": "rollup -c -w --watch.onEnd=\"streamdeck restart com.omar-mciver.tools\"",
        "prettier": "prettier . --write"
    },
    "type": "module",
    "dependencies": {
        "@elgato/streamdeck": "^1.0.0"
    },
    "devDependencies": {
        "@elgato/cli": "^1.1.0",
        "@rollup/plugin-typescript": "^12.1.0",
        "typescript": "^5.2.2"
    },
    "packageManager": "pnpm@10.6.5+sha512..."
}
```

**Key Points:**
- `"type": "module"` - Forces ES module system
- `watch` script - Development hot-reload
- `packageManager` - Enforces pnpm version

**Related Files:**
- `pnpm-lock.yaml` - Exact dependency versions

---

### `/tsconfig.json` - TypeScript Configuration

**Purpose:** TypeScript compiler settings

**Configuration:**

```json
{
    "extends": "@tsconfig/node20/tsconfig.json",
    "compilerOptions": {
        "customConditions": ["node"],
        "module": "ES2022",
        "moduleResolution": "Bundler",
        "noImplicitOverride": true
    },
    "include": ["src/**/*.ts"],
    "exclude": ["node_modules"]
}
```

**Key Settings:**
- **extends:** Node.js 20 baseline configuration
- **module:** ES2022 module system
- **moduleResolution:** Bundler mode (optimized for Rollup)
- **noImplicitOverride:** Require explicit `override` keywords

**Impact:**
- Determines TypeScript compilation target
- Affects IDE type checking
- Influences build output format

---

### `/rollup.config.mjs` - Build Configuration

**Purpose:** Rollup bundler configuration

**Pipeline:**
1. **typescript plugin** - Compile TS to JS
2. **node-resolve** - Resolve node_modules imports
3. **commonjs** - Convert CommonJS to ESM
4. **terser** - Minify (production only)
5. **emit-module-package-file** - Generate package.json for output

**Key Configuration:**

```javascript
const config = {
    input: "src/plugin.ts",
    output: {
        file: `${sdPlugin}/bin/plugin.js`,
        sourcemap: isWatching
    },
    plugins: [
        typescript(),
        nodeResolve(),
        commonjs(),
        !isWatching && terser()
    ]
};
```

**Watch Mode:**
- Monitors `src/**` and `manifest.json`
- Triggers rebuild on changes
- Executes restart command on completion

---

### `/com.omar-mciver.tools.sdPlugin/manifest.json` - Plugin Manifest

**Purpose:** Plugin metadata and configuration

**Structure:**

```json
{
    "Name": "tools",
    "Version": "0.1.0.0",
    "Author": "Omar McIver",
    "Actions": [
        {
            "Name": "IP Address",
            "UUID": "com.omar-mciver.tools.ifconfig",
            "Icon": "imgs/actions/counter/icon",
            "PropertyInspectorPath": "ui/increment-counter.html",
            "Controllers": ["Keypad"],
            "States": [...]
        }
    ],
    "Category": "Omar's Tools",
    "CodePath": "bin/plugin.js",
    "UUID": "com.omar-mciver.tools",
    "SDKVersion": 2,
    "Software": {
        "MinimumVersion": "6.4"
    },
    "OS": [...],
    "Nodejs": {
        "Version": "20",
        "Debug": "enabled"
    }
}
```

**Critical Fields:**
- **UUID:** Unique plugin identifier (must never change)
- **Version:** Semantic version for updates
- **CodePath:** Relative path to compiled plugin
- **Actions:** Array of all available actions
- **Nodejs.Version:** Required Node.js runtime version

**Action Definition:**
- **Name:** Display name in Stream Deck UI
- **UUID:** Unique action identifier
- **Icon:** Path to action icon (without file extension)
- **PropertyInspectorPath:** Settings UI HTML file
- **Controllers:** Supported devices (Keypad, Encoder)
- **States:** Visual states and alignment

**Validation:**
```bash
cat com.omar-mciver.tools.sdPlugin/manifest.json | jq .
```

---

### `/.editorconfig` - Editor Configuration

**Purpose:** Consistent code formatting across editors

**Settings:**

```ini
root = true

[*]
indent_style = tab
insert_final_newline = true
trim_trailing_whitespace = true
```

**Supported Editors:**
- VS Code (with extension)
- WebStorm, IntelliJ IDEA
- Sublime Text, Atom

---

### `/.gitignore` - Git Ignore Rules

**Purpose:** Exclude generated and temporary files from version control

**Key Exclusions:**

```
# Dependencies
node_modules/

# Build output
com.omar-mciver.tools.sdPlugin/bin/
*.tsbuildinfo

# Logs
com.omar-mciver.tools.sdPlugin/logs/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/settings.json
```

**Committed Files:**
- Source code (`src/`)
- Configuration files
- Documentation
- Plugin assets (images, UI)
- Manifest

**Not Committed:**
- `node_modules/` (reinstall with pnpm)
- `bin/` (regenerate with build)
- `logs/` (runtime generated)

---

## Source Code Organization

### `/src/plugin.ts` - Plugin Entry Point

**Purpose:** Initialize SDK and register actions

**Responsibilities:**
1. Import Stream Deck SDK
2. Configure logging level
3. Import action classes
4. Register all actions
5. Connect to Stream Deck

**Code Structure:**

```typescript
// Imports
import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { IfConfigInfo } from "./actions/ifconfig-info";

// Configuration
streamDeck.logger.setLevel(LogLevel.TRACE);

// Registration
streamDeck.actions.registerAction(new IfConfigInfo());

// Connection
streamDeck.connect();
```

**Lines:** 13 (very concise)

**Modification:**
- Add new imports when creating actions
- Register new actions with `registerAction()`
- Avoid complex logic (keep as entry point only)

---

### `/src/actions/ifconfig-info.ts` - IP Address Action

**Purpose:** Display external IP address with refresh and URL opening

**Class Structure:**

```typescript
@action({ UUID: "com.omar-mciver.tools.ifconfig" })
export class IfConfigInfo extends SingletonAction<IfConfigInfoSettings> {
    // Event handlers
    onWillAppear() { }
    onKeyDown() { }
    onKeyUp() { }
}

// Settings type
type IfConfigInfoSettings = {
    ip_addr?: string;
    keyDownTimestamp?: number;
    delayToOpenUrl?: number;
};
```

**Event Handlers:**
1. **onWillAppear** (lines 5-11)
   - Fetch IP on action appearance
   - Format and display

2. **onKeyDown** (lines 13-27)
   - Show loading feedback
   - Fetch fresh IP after delay
   - Update display

3. **onKeyUp** (lines 29-48)
   - Calculate press duration
   - Open URL if threshold exceeded
   - Clear timestamp

**Lines:** 59 total

**Pattern:**
- Extend `SingletonAction<TSettings>`
- Use `@action` decorator with UUID
- Override specific event handlers
- Type-safe settings interface

---

## Asset Organization

### `/com.omar-mciver.tools.sdPlugin/imgs/` - Images

**Plugin-Level Icons:**

**Location:** `imgs/plugin/`

| File | Size | Purpose |
|------|------|---------|
| `marketplace@2x.png` | 288×288 | Store listing icon |
| `category-icon@2x.png` | 56×56 | Actions panel category |

**Action-Level Icons:**

**Location:** `imgs/actions/counter/`

| File | Size | Purpose |
|------|------|---------|
| `icon@2x.png` | 144×144 | Action in actions list |
| `none@2x.png` | 144×144 | Default key state |

**Naming Convention:**
- `@2x` suffix indicates 2x resolution (Retina display)
- Path in manifest omits file extension and `@2x` suffix
- Stream Deck automatically selects appropriate resolution

**Requirements:**
- Format: PNG with transparency
- Color: Monochrome recommended for consistency
- Style: Simple, recognizable at small sizes

**Adding New Action Icons:**
1. Create directory: `imgs/actions/new-action/`
2. Add `icon@2x.png` (144×144)
3. Add state images as needed
4. Reference in manifest without extension: `imgs/actions/new-action/icon`

---

### `/com.omar-mciver.tools.sdPlugin/ui/` - Property Inspector

**Purpose:** HTML-based settings interfaces

**Current File:** `increment-counter.html`

**Structure:**

```html
<!doctype html>
<html>
    <head lang="en">
        <title>Increment Counter Settings</title>
        <meta charset="utf-8" />
        <script src="https://sdpi-components.dev/releases/v3/sdpi-components.js"></script>
    </head>
    <body>
        <sdpi-item label="Hold delay">
            <sdpi-range
                setting="delayToOpenUrl"
                min="0.5"
                max="5"
                step="0.5"
                default="0.5"
                showlabels>
            </sdpi-range>
        </sdpi-item>
    </body>
</html>
```

**Components:**
- **sdpi-item:** Container with label
- **sdpi-range:** Slider input
- **setting:** Maps to settings property
- **Attributes:** min, max, step, default

**Framework:** [SDPI Components v3](https://sdpi-components.dev/)

**Available Components:**
- `<sdpi-textfield>` - Text input
- `<sdpi-checkbox>` - Boolean toggle
- `<sdpi-select>` - Dropdown menu
- `<sdpi-textarea>` - Multi-line text
- `<sdpi-range>` - Slider
- `<sdpi-color>` - Color picker

**Data Binding:**
- Automatic two-way binding via `setting` attribute
- No JavaScript required for simple cases
- Changes automatically persist to action settings

**Adding Settings UI:**
1. Create HTML file in `ui/`
2. Include SDPI Components script
3. Add form components with `setting` attributes
4. Reference in manifest `PropertyInspectorPath`

---

## Generated Files & Directories

### `/com.omar-mciver.tools.sdPlugin/bin/` - Build Output

**Generated By:** Rollup bundler

**Contents:**
- `plugin.js` - Bundled and compiled plugin code
- `package.json` - `{ "type": "module" }` for ESM

**Characteristics:**
- Single-file bundle (all dependencies included)
- ES2022 JavaScript
- Source maps (development mode)
- Minified (production mode)

**Regeneration:**
```bash
pnpm build
```

**Git Status:** Ignored (`.gitignore`)

---

### `/com.omar-mciver.tools.sdPlugin/logs/` - Runtime Logs

**Generated By:** Stream Deck plugin runtime

**Contents:**
- `plugin.log` - Current session
- `plugin.log.1` - Previous session (rotated)

**Log Format:**
```
[2024-10-23 12:00:00.000] [INFO] Key up timestamp: 1729694400123
[2024-10-23 12:00:00.100] [INFO] Key down timestamp: 1729694399000
```

**Configuration:**
- Log level set in `src/plugin.ts`
- Current: `LogLevel.TRACE` (development)
- Recommended production: `LogLevel.INFO`

**Viewing:**
```bash
tail -f com.omar-mciver.tools.sdPlugin/logs/plugin.log
```

**Git Status:** Ignored (`.gitignore`)

---

### `/node_modules/` - Dependencies

**Generated By:** pnpm install

**Size:** ~50MB (varies with dependencies)

**Key Packages:**
- `@elgato/streamdeck` - SDK (required)
- `typescript` - Compiler (devDependency)
- `rollup` - Bundler (devDependency)

**Management:**
```bash
# Install
pnpm install

# Update
pnpm update

# Clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Git Status:** Ignored (`.gitignore`)

---

## File Size Reference

| Item | Size | Notes |
|------|------|-------|
| Source code (`src/`) | ~5KB | TypeScript source |
| Compiled bundle (`bin/plugin.js`) | ~50KB | Minified production |
| Documentation (`docs/`) | ~200KB | Comprehensive guides |
| Dependencies (`node_modules/`) | ~50MB | Development dependencies |
| Plugin package (distributable) | ~2MB | Complete with assets |
| Repository total | ~52MB | Including dependencies |

**Distribution Size:** ~2MB (plugin package only, no node_modules)

---

## Path Conventions

### Absolute vs Relative Paths

**Manifest References:**
- Use relative paths from plugin root
- No leading slash
- Example: `imgs/actions/counter/icon`

**Code References:**
- Use relative imports
- Example: `import { IfConfigInfo } from "./actions/ifconfig-info"`

**Asset URLs:**
- Relative to plugin package root
- Example: `Icon: "imgs/actions/counter/icon"`

### Cross-Platform Compatibility

**Path Separators:**
- Use forward slashes `/` in all paths
- Avoid backslashes `\` (Windows-specific)
- Node.js and Rollup handle conversion

**Case Sensitivity:**
- macOS/Linux: Case-sensitive
- Windows: Case-insensitive
- Best practice: Match exact case

---

## Extensibility Points

### Adding New Actions

**Files to Create/Modify:**
1. `src/actions/new-action.ts` - Action implementation
2. `src/plugin.ts` - Add registration
3. `manifest.json` - Add action definition
4. `ui/new-action.html` - Settings UI (optional)
5. `imgs/actions/new-action/` - Icons

### Adding Shared Services

**Recommended Structure:**
```
src/
├── actions/
│   ├── ifconfig-info.ts
│   └── new-action.ts
├── services/               # New directory
│   ├── api-service.ts     # Shared API logic
│   └── cache-service.ts   # Caching utilities
└── plugin.ts
```

**Usage:**
```typescript
// src/services/api-service.ts
export class ApiService {
    async fetch(url: string): Promise<string> { }
}

// src/actions/new-action.ts
import { ApiService } from "../services/api-service";
```

### Adding Tests

**Recommended Structure:**
```
streamdeck/
├── src/
├── tests/                  # New directory
│   ├── unit/
│   │   └── actions/
│   │       └── ifconfig-info.test.ts
│   └── integration/
│       └── plugin.test.ts
└── package.json
```

**Dependencies:**
```json
{
    "devDependencies": {
        "jest": "^29.0.0",
        "@types/jest": "^29.0.0"
    }
}
```

---

## Version Control Strategy

### What to Commit

**Always:**
- Source code (`src/`)
- Configuration files (`.json`, `.mjs`)
- Documentation (`docs/`, `README.md`)
- Assets (`imgs/`, `ui/`)
- Manifest (`manifest.json`)

**Never:**
- Dependencies (`node_modules/`)
- Build output (`bin/`)
- Logs (`logs/`)
- OS files (`.DS_Store`, `Thumbs.db`)

### Branching Model

**Recommended:**
- `main` - Stable releases
- `develop` - Active development
- `feature/*` - New features
- `bugfix/*` - Bug fixes

---

## Distribution Checklist

**Before Distributing:**

1. **Build Production:**
   ```bash
   NODE_ENV=production pnpm build
   ```

2. **Update Version:**
   - `manifest.json` - Increment `Version`
   - `README.md` - Update version references

3. **Test Plugin:**
   - Install and verify all actions
   - Test all settings configurations
   - Verify cross-platform compatibility

4. **Package Plugin:**
   ```bash
   cd com.omar-mciver.tools.sdPlugin/
   zip -r ../com.omar-mciver.tools.streamDeckPlugin *
   ```

5. **Verify Package:**
   - Extract and test installation
   - Check file sizes
   - Verify no development artifacts included

---

## Maintenance Guidelines

### Regular Tasks

**Weekly:**
- Review and rotate logs
- Check for dependency updates
- Test on latest Stream Deck version

**Monthly:**
- Update dependencies: `pnpm update`
- Review and update documentation
- Audit bundle size

**Per Release:**
- Increment version in manifest
- Tag release in Git
- Update changelog

---

## Quick Reference

### Common File Paths

| Purpose | Path |
|---------|------|
| Main entry | `src/plugin.ts` |
| Add action | `src/actions/` |
| Plugin metadata | `com.omar-mciver.tools.sdPlugin/manifest.json` |
| Settings UI | `com.omar-mciver.tools.sdPlugin/ui/` |
| Action icons | `com.omar-mciver.tools.sdPlugin/imgs/actions/` |
| Documentation | `docs/` |
| Build config | `rollup.config.mjs` |
| TypeScript config | `tsconfig.json` |

### File Extensions Reference

| Extension | Type | Purpose |
|-----------|------|---------|
| `.ts` | TypeScript | Source code |
| `.js` | JavaScript | Compiled output |
| `.mjs` | ES Module | Config files (Node.js ESM) |
| `.json` | JSON | Configuration data |
| `.html` | HTML | Property Inspector UI |
| `.png` | Image | Icons and graphics |
| `.md` | Markdown | Documentation |

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [API_REFERENCE.md](API_REFERENCE.md) - API details
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Development workflows
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Issue resolution
