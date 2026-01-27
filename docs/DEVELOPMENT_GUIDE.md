# Development Guide

## Getting Started

### Prerequisites

**Required:**
- Node.js 20.x (bundled with plugin, but useful for development)
- pnpm 10.6.5+
- Elgato Stream Deck Software 6.4+
- Git

**Optional:**
- VS Code with TypeScript extensions
- Elgato CLI tools (`@elgato/cli`)

### Initial Setup

1. **Clone Repository:**
   ```bash
   git clone <repository-url>
   cd streamdeck
   ```

2. **Install Dependencies:**
   ```bash
   pnpm install
   ```

3. **Verify Installation:**
   ```bash
   pnpm build
   ```

4. **Install Plugin:**
   ```bash
   streamdeck install com.omar-mciver.tools
   ```

---

## Development Workflow

### Hot-Reload Development

**Start Watch Mode:**
```bash
pnpm watch
```

**Behavior:**
- Monitors `src/**/*.ts` for changes
- Watches `manifest.json` for updates
- Automatically rebuilds on save
- Restarts plugin in Stream Deck
- Preserves action settings

**Typical Workflow:**
1. Start watch mode: `pnpm watch`
2. Make code changes in `src/`
3. Save file (triggers rebuild)
4. Plugin automatically reloads in Stream Deck
5. Test changes immediately

**Watch Mode Output:**
```
[rollup] watching for changes...
[rollup] changed: src/actions/ifconfig-info.ts
[rollup] rebuilding...
[rollup] built in 1.2s
[streamdeck] restarting com.omar-mciver.tools
```

### Manual Build Process

**Production Build:**
```bash
pnpm build
```

**Development Build (with source maps):**
```bash
ROLLUP_WATCH=true pnpm build
```

**Build Output:**
- `com.omar-mciver.tools.sdPlugin/bin/plugin.js` - Compiled bundle
- `com.omar-mciver.tools.sdPlugin/bin/package.json` - ESM marker
- Source maps (development only)

### Code Formatting

**Format All Files:**
```bash
pnpm prettier
```

**Prettier Configuration:**
- Extends: `@elgato/prettier-config`
- Auto-format on save (VS Code recommended)

---

## Project Structure Deep Dive

```
streamdeck/
├── src/                          # Source code (TypeScript)
│   ├── plugin.ts                 # Plugin entry point
│   └── actions/                  # Action implementations
│       └── ifconfig-info.ts      # IP address action
│
├── com.omar-mciver.tools.sdPlugin/  # Plugin package (distributable)
│   ├── manifest.json             # Plugin metadata
│   ├── bin/                      # Compiled code (generated)
│   │   ├── plugin.js
│   │   └── package.json
│   ├── imgs/                     # Plugin assets
│   │   ├── plugin/               # Plugin icon
│   │   │   ├── marketplace@2x.png
│   │   │   └── category-icon@2x.png
│   │   └── actions/              # Action icons
│   │       └── counter/
│   │           ├── icon@2x.png
│   │           └── none@2x.png
│   ├── ui/                       # Property Inspector UI
│   │   └── increment-counter.html
│   └── logs/                     # Runtime logs (generated)
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   └── DEVELOPMENT_GUIDE.md
│
├── package.json                  # NPM configuration
├── pnpm-lock.yaml               # Dependency lock file
├── tsconfig.json                # TypeScript configuration
├── rollup.config.mjs            # Build configuration
├── .editorconfig                # Editor settings
├── .gitignore                   # Git ignore rules
└── README.md                    # Project overview
```

---

## Adding New Features

### Creating a New Action

**1. Create Action File:**

```typescript
// src/actions/new-action.ts
import streamDeck, {
    action,
    KeyDownEvent,
    SingletonAction,
    WillAppearEvent
} from "@elgato/streamdeck";

/**
 * Action description and purpose
 */
@action({ UUID: "com.omar-mciver.tools.new-action" })
export class NewAction extends SingletonAction<NewActionSettings> {

    /**
     * Initialize action when it appears on Stream Deck
     */
    override async onWillAppear(ev: WillAppearEvent<NewActionSettings>): Promise<void> {
        // Initialization logic
        await ev.action.setTitle("Ready");
    }

    /**
     * Handle key press
     */
    override async onKeyDown(ev: KeyDownEvent<NewActionSettings>): Promise<void> {
        const { settings } = ev.payload;

        // Action logic
        await ev.action.setTitle("Processing...");

        // Example: Fetch data, update settings, show feedback
        await ev.action.showOk();
    }
}

/**
 * Settings schema for NewAction
 */
type NewActionSettings = {
    customSetting?: string;
    enableFeature?: boolean;
};
```

**2. Register Action:**

```typescript
// src/plugin.ts
import { NewAction } from "./actions/new-action";

// Add after existing registrations
streamDeck.actions.registerAction(new NewAction());
```

**3. Update Manifest:**

```json
// com.omar-mciver.tools.sdPlugin/manifest.json
{
    "Actions": [
        {
            "Name": "New Action",
            "UUID": "com.omar-mciver.tools.new-action",
            "Icon": "imgs/actions/new-action/icon",
            "Tooltip": "Description of what this action does",
            "PropertyInspectorPath": "ui/new-action.html",
            "Controllers": ["Keypad"],
            "States": [
                {
                    "Image": "imgs/actions/new-action/default",
                    "TitleAlignment": "middle"
                }
            ]
        }
    ]
}
```

**4. Create Property Inspector (Optional):**

```html
<!-- com.omar-mciver.tools.sdPlugin/ui/new-action.html -->
<!doctype html>
<html>
    <head lang="en">
        <title>New Action Settings</title>
        <meta charset="utf-8" />
        <script src="https://sdpi-components.dev/releases/v3/sdpi-components.js"></script>
    </head>
    <body>
        <sdpi-item label="Custom Setting">
            <sdpi-textfield setting="customSetting" placeholder="Enter value"></sdpi-textfield>
        </sdpi-item>

        <sdpi-item label="Enable Feature">
            <sdpi-checkbox setting="enableFeature"></sdpi-checkbox>
        </sdpi-item>
    </body>
</html>
```

**5. Create Action Icons:**

Place icons in `com.omar-mciver.tools.sdPlugin/imgs/actions/new-action/`:
- `icon@2x.png` - 144x144px (action icon)
- `default@2x.png` - 144x144px (key display)

**6. Test:**
```bash
pnpm watch
# Add action to Stream Deck
# Test functionality
```

---

## Working with Settings

### Settings Persistence

**Settings Flow:**
```
User changes setting in Property Inspector
    ↓
Stream Deck persists to database
    ↓
Plugin receives onDidReceiveSettings event
    ↓
Action updates behavior
```

### Reading Settings

```typescript
override async onKeyDown(ev: KeyDownEvent<MySettings>): Promise<void> {
    const { settings } = ev.payload;

    // Access typed settings
    const value = settings.customSetting ?? "default";
    const enabled = settings.enableFeature ?? false;

    // Use settings
    if (enabled) {
        // Feature-enabled logic
    }
}
```

### Updating Settings

```typescript
override async onKeyDown(ev: KeyDownEvent<MySettings>): Promise<void> {
    const { settings } = ev.payload;

    // Modify settings
    settings.counter = (settings.counter ?? 0) + 1;
    settings.lastUpdated = Date.now();

    // Persist changes
    await ev.action.setSettings(settings);
}
```

### Settings Validation

```typescript
override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<MySettings>
): Promise<void> {
    const { settings } = ev.payload;

    // Validate
    if (!isValidSettings(settings)) {
        streamDeck.logger.warn("Invalid settings detected", settings);

        // Reset to defaults
        const defaults: MySettings = {
            customSetting: "default",
            enableFeature: true
        };
        await ev.action.setSettings(defaults);
    }
}

function isValidSettings(settings: MySettings): boolean {
    return (
        typeof settings.customSetting === 'string' &&
        typeof settings.enableFeature === 'boolean'
    );
}
```

---

## External API Integration

### HTTP Requests

**Basic Pattern:**
```typescript
async fetchData(url: string): Promise<string> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'StreamDeck-Tools/0.1.0'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();

    } catch (error) {
        if (error.name === 'AbortError') {
            streamDeck.logger.error("Request timeout", { url });
        } else {
            streamDeck.logger.error("Fetch failed", { url, error });
        }
        throw error;
    }
}
```

**Usage in Action:**
```typescript
override async onKeyDown(ev: KeyDownEvent<MySettings>): Promise<void> {
    try {
        await ev.action.setTitle("Loading...");

        const data = await this.fetchData("https://api.example.com/data");

        await ev.action.setTitle(data);
        await ev.action.showOk();

    } catch (error) {
        await ev.action.setTitle("Error");
        await ev.action.showAlert();
    }
}
```

### Caching Strategies

**Time-Based Cache:**
```typescript
class CachedApiService {
    private cache: Map<string, { data: string; timestamp: number }> = new Map();
    private readonly TTL = 60000; // 1 minute

    async fetch(url: string): Promise<string> {
        const cached = this.cache.get(url);
        const now = Date.now();

        // Return cached if fresh
        if (cached && (now - cached.timestamp) < this.TTL) {
            streamDeck.logger.debug("Cache hit", { url });
            return cached.data;
        }

        // Fetch fresh data
        streamDeck.logger.debug("Cache miss", { url });
        const response = await fetch(url);
        const data = await response.text();

        // Update cache
        this.cache.set(url, { data, timestamp: now });

        return data;
    }

    clearCache(): void {
        this.cache.clear();
    }
}
```

---

## Testing

### Manual Testing Checklist

**For Each Action:**
- [ ] Action appears in Stream Deck actions list
- [ ] Icon displays correctly
- [ ] Title updates as expected
- [ ] Key press triggers correct behavior
- [ ] Settings persist after restart
- [ ] Property Inspector UI works
- [ ] Error states handled gracefully
- [ ] Performance is acceptable (<1s response)

### Testing Long-Running Operations

**Pattern:**
```typescript
override async onKeyDown(ev: KeyDownEvent<MySettings>): Promise<void> {
    const startTime = Date.now();

    try {
        await this.longRunningOperation();

        const duration = Date.now() - startTime;
        streamDeck.logger.info("Operation complete", { duration });

    } catch (error) {
        streamDeck.logger.error("Operation failed", { error });
    }
}
```

### Testing Network Failures

**Simulate Offline:**
```typescript
// Temporarily modify fetch to simulate failure
const originalFetch = global.fetch;
global.fetch = () => Promise.reject(new Error("Network offline"));

// Test error handling
await action.onKeyDown(mockEvent);

// Restore
global.fetch = originalFetch;
```

---

## Debugging

### Logging Best Practices

**Structured Logging:**
```typescript
streamDeck.logger.info("Action event", {
    action: "ifconfig",
    event: "keyDown",
    settings: ev.payload.settings,
    timestamp: Date.now()
});
```

**Log Levels by Environment:**
```typescript
// Development
streamDeck.logger.setLevel(LogLevel.TRACE);

// Production
streamDeck.logger.setLevel(LogLevel.INFO);
```

### Viewing Logs

**Log Location:**
```
com.omar-mciver.tools.sdPlugin/logs/
├── plugin.log          # Current session
└── plugin.log.1        # Previous session
```

**Tail Logs:**
```bash
tail -f com.omar-mciver.tools.sdPlugin/logs/plugin.log
```

### Common Issues

#### Issue: Plugin Not Loading

**Symptoms:**
- Action not appearing in Stream Deck
- No logs generated

**Diagnosis:**
```bash
# Check if plugin is installed
streamdeck list

# Verify manifest syntax
cat com.omar-mciver.tools.sdPlugin/manifest.json | jq

# Check for build errors
pnpm build
```

**Solution:**
1. Verify manifest.json is valid JSON
2. Ensure all action UUIDs are unique
3. Check Node.js version in manifest matches available runtime
4. Reinstall: `streamdeck install com.omar-mciver.tools --force`

---

#### Issue: TypeScript Errors

**Symptoms:**
- Build fails with type errors
- IDE shows red squiggles

**Diagnosis:**
```bash
# Check TypeScript compilation
pnpm tsc --noEmit

# Verify types are installed
ls node_modules/@types/
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Update TypeScript
pnpm update typescript
```

---

#### Issue: Changes Not Reflecting

**Symptoms:**
- Code changes don't appear in Stream Deck
- Old behavior persists

**Diagnosis:**
```bash
# Check if build completed
ls -l com.omar-mciver.tools.sdPlugin/bin/plugin.js

# Verify plugin restarted
streamdeck list
```

**Solution:**
```bash
# Manual restart
streamdeck restart com.omar-mciver.tools

# Force reinstall
streamdeck install com.omar-mciver.tools --force

# Clear Stream Deck cache
# (Restart Stream Deck application)
```

---

## Performance Optimization

### Reducing Bundle Size

**Current:** ~50KB minified

**Optimization Strategies:**
1. Avoid large dependencies
2. Use tree-shaking (already enabled)
3. Minify with terser (production builds)
4. Remove debug logging in production

**Example:**
```typescript
// Conditional logging
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
    streamDeck.logger.debug("Detailed debug info", data);
}
```

### Minimizing API Calls

**Pattern:**
```typescript
class ApiThrottler {
    private pending: Map<string, Promise<any>> = new Map();

    async fetch(url: string): Promise<any> {
        // Return existing promise if request in flight
        if (this.pending.has(url)) {
            return this.pending.get(url);
        }

        // Create new request
        const promise = fetch(url)
            .then(r => r.json())
            .finally(() => this.pending.delete(url));

        this.pending.set(url, promise);
        return promise;
    }
}
```

---

## CI/CD Considerations

### Automated Build

**GitHub Actions Example:**
```yaml
name: Build Plugin

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10.6.5

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Check formatting
        run: pnpm prettier --check .

      - name: Upload plugin artifact
        uses: actions/upload-artifact@v3
        with:
          name: plugin-package
          path: com.omar-mciver.tools.sdPlugin/
```

### Versioning

**Update Version:**
```bash
# Update manifest.json
vim com.omar-mciver.tools.sdPlugin/manifest.json
# Change "Version": "0.1.0.0" to "0.2.0.0"

# Commit and tag
git add com.omar-mciver.tools.sdPlugin/manifest.json
git commit -m "Release version 0.2.0.0"
git tag v0.2.0.0
git push origin main --tags
```

---

## Code Style Guidelines

### TypeScript Conventions

**Naming:**
```typescript
// Classes: PascalCase
class IfConfigInfo {}

// Functions: camelCase
async fetchIpAddress() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Types: PascalCase
type IfConfigInfoSettings = {};
```

**Async/Await:**
```typescript
// Prefer async/await over .then()
async function good() {
    const result = await fetch(url);
    return result.text();
}

// Avoid
function avoid() {
    return fetch(url).then(r => r.text());
}
```

**Error Handling:**
```typescript
// Always handle errors
try {
    await riskyOperation();
} catch (error) {
    streamDeck.logger.error("Operation failed", { error });
    throw error; // Re-throw if caller should handle
}
```

### Documentation Comments

**Function Documentation:**
```typescript
/**
 * Fetches external IP address from ifconfig.me
 *
 * @returns Formatted IP address with line breaks
 * @throws {Error} If network request fails
 */
async fetchIpAddress(): Promise<string> {
    // Implementation
}
```

**Settings Documentation:**
```typescript
/**
 * Settings for {@link IfConfigInfo}
 */
type IfConfigInfoSettings = {
    /** Cached IP address with line breaks */
    ip_addr?: string;

    /** Timestamp when key was pressed (Unix milliseconds) */
    keyDownTimestamp?: number;

    /** Long-press threshold in seconds (0.5-5.0) */
    delayToOpenUrl?: number;
};
```

---

## Resources

### Official Documentation
- [Stream Deck SDK Documentation](https://docs.elgato.com/sdk/)
- [Elgato SDK GitHub](https://github.com/elgatosf/streamdeck)
- [SDPI Components](https://sdpi-components.dev/)

### Community Resources
- [Stream Deck Developer Forums](https://forums.elgato.com/forum/stream-deck-forum)
- [Example Plugins](https://github.com/elgatosf/streamdeck-examples)

### Development Tools
- [Stream Deck CLI](https://www.npmjs.com/package/@elgato/cli)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=elgato.streamdeck)

---

## Contributing Guidelines

### Branch Strategy
- `main` - Stable releases
- `develop` - Active development
- `feature/*` - New features
- `bugfix/*` - Bug fixes

### Commit Messages
```
feat: Add new action for system monitoring
fix: Resolve IP address formatting issue
docs: Update API reference for new settings
refactor: Simplify settings validation logic
chore: Update dependencies to latest versions
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Settings persist correctly

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] No merge conflicts
```

---

## Next Steps

1. **Explore Examples:** Review `src/actions/ifconfig-info.ts` as reference
2. **Create Action:** Follow "Adding New Features" guide above
3. **Test Thoroughly:** Use manual testing checklist
4. **Document:** Update API reference for new features
5. **Deploy:** Tag release and distribute plugin

For questions or issues, refer to:
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [API_REFERENCE.md](API_REFERENCE.md) - Detailed API docs
- [README.md](../README.md) - Project overview
