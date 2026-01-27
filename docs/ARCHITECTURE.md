# Architecture Documentation

## System Overview

The Stream Deck Tools plugin is a TypeScript-based application that integrates with the Elgato Stream Deck software ecosystem to provide custom utility actions.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Stream Deck Application                        │
│  (Elgato Software running on user's computer)           │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket Connection
                     │ (bidirectional communication)
┌────────────────────▼────────────────────────────────────┐
│         Plugin Process (Node.js 20)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  plugin.ts (Entry Point)                          │  │
│  │  - SDK initialization                             │  │
│  │  - Action registration                            │  │
│  │  - Connection management                          │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                    │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Action Service                                    │  │
│  │  - Event routing                                   │  │
│  │  - State management                                │  │
│  │  - Settings persistence                            │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                    │
│       ┌─────────────┴─────────────┐                     │
│       │                           │                     │
│  ┌────▼──────────┐      ┌────────▼─────────┐           │
│  │ IfConfigInfo  │      │  Future Actions  │           │
│  │   Action      │      │   (extensible)   │           │
│  └────┬──────────┘      └──────────────────┘           │
│       │                                                  │
│  ┌────▼──────────────────────────────────────┐          │
│  │  External Services                        │          │
│  │  - ifconfig.me API (IP retrieval)        │          │
│  │  - URL opening (system browser)          │          │
│  └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Plugin Entry Point (`src/plugin.ts`)

**Responsibilities:**
- Initialize Stream Deck SDK
- Configure logging level (TRACE for development)
- Register all action instances
- Establish WebSocket connection to Stream Deck software

**Dependencies:**
- `@elgato/streamdeck` SDK
- Action implementations

**Key Code:**
```typescript
// src/plugin.ts:1-13
streamDeck.logger.setLevel(LogLevel.TRACE);
streamDeck.actions.registerAction(new IfConfigInfo());
streamDeck.connect();
```

### 2. Action System

#### Base Pattern: SingletonAction

Actions extend `SingletonAction<TSettings>` from the Elgato SDK, providing:
- Type-safe settings management
- Event lifecycle handlers
- State persistence
- UI communication

#### IfConfigInfo Action (`src/actions/ifconfig-info.ts`)

**UUID:** `com.omar-mciver.tools.ifconfig`

**Event Lifecycle:**

```
┌─────────────────────────────────────────────────┐
│  User adds action to Stream Deck               │
└────────────┬────────────────────────────────────┘
             │
             ▼
      onWillAppear()
      - Fetch IP from ifconfig.me
      - Format with line breaks
      - Set title on key
             │
             ▼
      ┌─────────────────┐
      │  Key Displayed  │
      └─────────────────┘
             │
             ▼
      User presses key
             │
             ▼
      onKeyDown()
      - Show "Asking..." feedback
      - Store timestamp
      - Fetch fresh IP (500ms delay)
      - Update display
             │
             ▼
      User releases key
             │
             ▼
      onKeyUp()
      - Calculate press duration
      - If duration > threshold:
          • Open ifconfig.me URL
          • Show success checkmark
      - Clear timestamp
```

**Settings Schema:**
```typescript
type IfConfigInfoSettings = {
    ip_addr?: string;          // Cached IP address
    keyDownTimestamp?: number; // Press start time
    delayToOpenUrl?: number;   // Threshold in seconds
}
```

**State Management:**
- Settings stored per action instance
- Persisted by Stream Deck software
- Updated via `ev.action.setSettings()`
- Retrieved via `ev.payload.settings`

## Data Flow

### IP Address Retrieval Flow

```
┌──────────────┐
│ Stream Deck  │
│   Action     │
└──────┬───────┘
       │
       │ Event: onWillAppear / onKeyDown
       ▼
┌──────────────────────────────────────┐
│  IfConfigInfo.onWillAppear()         │
│  IfConfigInfo.onKeyDown()            │
└──────┬───────────────────────────────┘
       │
       │ HTTPS Request
       ▼
┌──────────────────────────────────────┐
│  https://ifconfig.me/ip              │
│  (External IP detection service)     │
└──────┬───────────────────────────────┘
       │
       │ Response: "192.168.1.1"
       ▼
┌──────────────────────────────────────┐
│  Format: "192.\n168.\n1.\n1"        │
│  (Line breaks for readability)       │
└──────┬───────────────────────────────┘
       │
       │ Update settings + title
       ▼
┌──────────────────────────────────────┐
│  ev.action.setSettings()             │
│  ev.action.setTitle()                │
└──────┬───────────────────────────────┘
       │
       │ WebSocket message
       ▼
┌──────────────────────────────────────┐
│  Stream Deck displays IP on key     │
└──────────────────────────────────────┘
```

### Long-Press URL Opening Flow

```
┌──────────────────────────────────────┐
│  User presses key                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  onKeyDown()                         │
│  - Store: settings.keyDownTimestamp  │
└──────┬───────────────────────────────┘
       │
       │ User holds key...
       │
       ▼
┌──────────────────────────────────────┐
│  User releases key                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  onKeyUp()                           │
│  - Calculate: duration = now - start │
│  - Check: duration > threshold?      │
└──────┬───────────────────────────────┘
       │
       ├─ YES ─────────────────┐
       │                       │
       ▼                       ▼
┌──────────────┐      ┌─────────────────┐
│ Open URL     │      │ No action       │
│ Show success │      │ Clear timestamp │
└──────────────┘      └─────────────────┘
```

## Build Architecture

### Build Pipeline

```
┌─────────────────────────────────────────────────────────┐
│  Source Code (src/)                                      │
│  - TypeScript ES2022                                     │
│  - Type definitions from @elgato/streamdeck             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  TypeScript Compiler                                     │
│  - Transpile to ES2022                                   │
│  - Type checking                                         │
│  - Source maps (dev mode)                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Rollup Bundler                                          │
│  Plugins:                                                │
│  1. typescript: Compile TypeScript                       │
│  2. node-resolve: Resolve node_modules                   │
│  3. commonjs: Convert CommonJS to ES modules             │
│  4. terser: Minify (production only)                     │
│  5. emit-module-package: Generate package.json           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Output                                                  │
│  com.omar-mciver.tools.sdPlugin/bin/plugin.js           │
│  - Single bundled file                                   │
│  - ES module format                                      │
│  - Production: minified, no source maps                  │
│  - Development: readable, with source maps               │
└─────────────────────────────────────────────────────────┘
```

### Watch Mode Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Rollup Watch Mode                                       │
│  - Monitor src/** for changes                            │
│  - Watch manifest.json for updates                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ File change detected
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Automatic Rebuild                                       │
│  - Incremental compilation                               │
│  - Fast iteration                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ onEnd hook
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Stream Deck CLI                                         │
│  streamdeck restart com.omar-mciver.tools               │
│  - Reload plugin in Stream Deck                          │
│  - Preserve settings                                     │
└─────────────────────────────────────────────────────────┘
```

## Communication Architecture

### WebSocket Protocol

The plugin communicates with Stream Deck software via WebSocket using Elgato's protocol:

**Plugin → Stream Deck (Commands):**
- `setTitle`: Update key display text
- `setImage`: Update key image
- `setSettings`: Persist action settings
- `showOk`: Display success checkmark
- `showAlert`: Display error indicator
- `openUrl`: Launch URL in default browser

**Stream Deck → Plugin (Events):**
- `didReceiveSettings`: Settings updated
- `willAppear`: Action added to layout
- `willDisappear`: Action removed
- `keyDown`: Key pressed
- `keyUp`: Key released
- `propertyInspectorDidAppear`: Settings UI opened

**Connection Lifecycle:**
```
1. Plugin starts → streamDeck.connect()
2. WebSocket connection established
3. Registration handshake
4. Event loop begins
5. Bidirectional message passing
6. Connection maintained until plugin stops
```

## Security Architecture

### External API Security

**ifconfig.me Integration:**
- Read-only API (no authentication required)
- HTTPS-only communication
- No sensitive data transmitted
- Public IP address only (already public information)

**Network Security:**
- No credential storage
- No persistent connections
- Standard HTTPS certificate validation
- Timeout handling for network failures

### Data Privacy

**Settings Storage:**
- Stored locally by Stream Deck software
- No cloud synchronization by plugin
- No telemetry or analytics collection
- IP address cached locally only

**Logging:**
- Development: TRACE level (verbose)
- Production: Should be INFO or WARN
- No sensitive data in logs
- Local log files only

## Performance Considerations

### Resource Usage

**Memory:**
- Single Node.js process
- Minimal state (settings per action instance)
- No background workers
- Efficient garbage collection

**Network:**
- On-demand API calls only
- 500ms delay for user feedback
- No polling or background updates
- Single HTTP request per refresh

**CPU:**
- Event-driven (no busy loops)
- Minimal computation (string formatting only)
- No image processing
- Fast response times (<100ms local operations)

### Optimization Strategies

**Caching:**
- IP address cached in settings
- No repeated fetches on layout refresh
- Manual refresh required for updates

**Debouncing:**
- 500ms delay before IP refresh on key press
- Prevents rapid API calls
- Improves user experience

**Async Operations:**
- Non-blocking fetch calls
- Async/await pattern throughout
- No blocking UI updates

## Extension Points

### Adding New Actions

**1. Create Action Class:**
```typescript
// src/actions/new-action.ts
import { action, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.omar-mciver.tools.new-action" })
export class NewAction extends SingletonAction<NewActionSettings> {
    override async onWillAppear(ev) {
        // Initialization logic
    }

    override async onKeyDown(ev) {
        // Key press handling
    }
}

type NewActionSettings = {
    // Type-safe settings
};
```

**2. Register in plugin.ts:**
```typescript
// src/plugin.ts
import { NewAction } from "./actions/new-action";
streamDeck.actions.registerAction(new NewAction());
```

**3. Add to manifest.json:**
```json
{
    "Actions": [
        {
            "Name": "New Action",
            "UUID": "com.omar-mciver.tools.new-action",
            "Icon": "imgs/actions/new-action/icon",
            "PropertyInspectorPath": "ui/new-action.html",
            "Controllers": ["Keypad"],
            "States": [...]
        }
    ]
}
```

### Adding External Services

**Pattern for API Integration:**
```typescript
class ExternalService {
    async fetchData(): Promise<string> {
        const response = await fetch("https://api.example.com/data");
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.text();
    }
}
```

**Error Handling:**
```typescript
try {
    const data = await service.fetchData();
    await ev.action.setTitle(data);
} catch (error) {
    streamDeck.logger.error("Fetch failed", error);
    await ev.action.showAlert();
}
```

## Technology Constraints

### Node.js Version Lock

- **Required:** Node.js 20
- **Bundled:** Plugin includes Node.js runtime
- **Reason:** Stream Deck software compatibility
- **Impact:** No system Node.js version dependency

### Module System

- **Format:** ES Modules (ESM)
- **No CommonJS:** Plugin package.json specifies `"type": "module"`
- **Import Style:** ES6 `import/export` only
- **Dynamic Imports:** Supported but not used

### TypeScript Configuration

- **Target:** ES2022
- **Module Resolution:** Bundler mode
- **No Implicit Override:** Explicit override keywords required
- **Strict Mode:** Partial (can be enhanced)

## Future Architecture Considerations

### Scalability

**Multiple Actions:**
- Current: Single action (IfConfigInfo)
- Future: Multiple utility actions
- Pattern: Shared services for common functionality
- Organization: Group related actions in subdirectories

**Shared Services:**
```typescript
// src/services/network-service.ts
export class NetworkService {
    async getPublicIP(): Promise<string> { }
    async getLocalIP(): Promise<string> { }
}

// Inject into multiple actions
```

### Testing Strategy

**Unit Tests:**
- Action logic isolation
- Mock Stream Deck SDK
- Test event handlers

**Integration Tests:**
- End-to-end with test Stream Deck instance
- Settings persistence verification
- Event flow validation

**Test Framework Recommendations:**
- Jest or Vitest for unit tests
- Playwright for E2E (if UI testing needed)
- Mock service for ifconfig.me API

### Monitoring & Debugging

**Enhanced Logging:**
```typescript
// Structured logging
streamDeck.logger.info("IP fetch", {
    timestamp: Date.now(),
    action: "ifconfig",
    success: true,
    duration: 150
});
```

**Error Tracking:**
- Capture and log all exceptions
- Context preservation (action UUID, settings)
- Rate limiting for repeated errors

**Performance Metrics:**
- API call timing
- Memory usage tracking
- Event processing latency

## References

- [Stream Deck SDK Documentation](https://docs.elgato.com/sdk/)
- [Elgato SDK GitHub](https://github.com/elgatosf/streamdeck)
- [Node.js 20 Documentation](https://nodejs.org/docs/latest-v20.x/api/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Rollup Documentation](https://rollupjs.org/)
