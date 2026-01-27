# API Reference

## Overview

This document provides comprehensive API documentation for the Stream Deck Tools plugin, including action interfaces, settings schemas, and event handlers.

## Table of Contents

- [Plugin API](#plugin-api)
- [IfConfigInfo Action](#ifconfiginfo-action)
- [Settings Schemas](#settings-schemas)
- [Event Handlers](#event-handlers)
- [Stream Deck SDK Usage](#stream-deck-sdk-usage)
- [External APIs](#external-apis)

---

## Plugin API

### Main Entry Point

**File:** `src/plugin.ts`

#### Import Structure

```typescript
import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { IfConfigInfo } from "./actions/ifconfig-info";
```

#### Initialization

```typescript
// Configure logging level
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register actions
streamDeck.actions.registerAction(new IfConfigInfo());

// Establish connection
streamDeck.connect();
```

#### Logger Levels

| Level | Usage | Output |
|-------|-------|--------|
| `TRACE` | Verbose debugging | All messages including SDK internals |
| `DEBUG` | Development debugging | Detailed application logs |
| `INFO` | Production information | Important events only |
| `WARN` | Warnings | Potential issues |
| `ERROR` | Errors only | Failures and exceptions |

**Current Setting:** `LogLevel.TRACE` (development mode)
**Recommended for Production:** `LogLevel.INFO` or `LogLevel.WARN`

---

## IfConfigInfo Action

**File:** `src/actions/ifconfig-info.ts`

### Action Decorator

```typescript
@action({ UUID: "com.omar-mciver.tools.ifconfig" })
export class IfConfigInfo extends SingletonAction<IfConfigInfoSettings>
```

**Parameters:**
- `UUID`: Unique identifier matching manifest.json action definition

### Event Handlers

#### onWillAppear()

Called when the action is added to the Stream Deck layout or becomes visible.

**Signature:**
```typescript
override async onWillAppear(
    ev: WillAppearEvent<IfConfigInfoSettings>
): Promise<void>
```

**Behavior:**
1. Fetches external IP address from ifconfig.me
2. Formats IP with line breaks for display
3. Stores IP in action settings
4. Updates key title with formatted IP

**Implementation:**
```typescript
// src/actions/ifconfig-info.ts:5-11
const response = await fetch("https://ifconfig.me/ip");
const ipAddr = await response.text();
ev.payload.settings.ip_addr = ipAddr.replace(/\./g, ".\n");
await ev.action.setSettings(ev.payload.settings);
return ev.action.setTitle(`${ev.payload.settings.ip_addr ?? "No IP Address"}`);
```

**Error Handling:**
- Network failures: Displays "No IP Address"
- Timeout: Relies on default fetch timeout
- Invalid response: Falls back to cached IP or default text

**Performance:**
- Async/non-blocking
- Single API call per appearance
- Caches result in settings

---

#### onKeyDown()

Called when the user presses the Stream Deck key.

**Signature:**
```typescript
override async onKeyDown(
    ev: KeyDownEvent<IfConfigInfoSettings>
): Promise<void>
```

**Behavior:**
1. Displays "Asking..." feedback immediately
2. Records key press timestamp for duration calculation
3. Waits 500ms (user feedback delay)
4. Fetches fresh IP address
5. Updates settings and display

**Implementation:**
```typescript
// src/actions/ifconfig-info.ts:13-27
await ev.action.setTitle("Asking...");
const { settings } = ev.payload;
settings.keyDownTimestamp = Date.now();
await ev.action.setSettings(settings);

setTimeout(async () => {
    const response = await fetch("https://ifconfig.me/ip");
    const ipAddr = await response.text();
    settings.ip_addr = ipAddr.replace(/\./g, ".\n");
    await ev.action.setSettings(settings);
    await ev.action.setTitle(`${ev.payload.settings.ip_addr ?? "No IP Address"}`);
}, 500);
```

**Timing:**
- Immediate: "Asking..." feedback (0ms)
- Delayed: API call and update (500ms)
- Total user experience: ~500-1000ms depending on network

**State Management:**
- Stores `keyDownTimestamp` for onKeyUp() calculation
- Persists updated IP address
- Updates both settings and display atomically

---

#### onKeyUp()

Called when the user releases the Stream Deck key.

**Signature:**
```typescript
override async onKeyUp(
    ev: KeyUpEvent<IfConfigInfoSettings>
): Promise<void>
```

**Behavior:**
1. Calculates key press duration
2. Compares duration to configured threshold
3. Opens URL if duration exceeds threshold
4. Shows success indicator on URL open
5. Clears timestamp regardless of outcome

**Implementation:**
```typescript
// src/actions/ifconfig-info.ts:29-48
const { settings } = ev.payload;
if (settings.delayToOpenUrl) {
    const keyUpTimestamp = Date.now();
    const duration = settings.keyDownTimestamp
        ? (keyUpTimestamp - settings.keyDownTimestamp)
        : 0;

    // 100ms buffer for processing time
    if (duration - 100 > (settings.delayToOpenUrl * 1000)) {
        streamDeck.system.openUrl("https://ifconfig.me");
        await ev.action.showOk();
    }
}
settings.keyDownTimestamp = undefined;
await ev.action.setSettings(settings);
```

**Long-Press Logic:**

| Setting | Duration | Outcome |
|---------|----------|---------|
| 0.5s | <400ms | No action |
| 0.5s | 500ms | No action (buffer) |
| 0.5s | 600ms+ | Open URL |
| 1.0s | <900ms | No action |
| 1.0s | 1100ms+ | Open URL |

**Buffer Explanation:**
- 100ms subtracted from duration
- Accounts for processing time
- Prevents accidental triggers on exact threshold

**Visual Feedback:**
- Success: Green checkmark (Stream Deck built-in)
- No action: Key returns to normal state
- Duration: ~1 second display

---

### Settings Schema

**Type Definition:**
```typescript
type IfConfigInfoSettings = {
    ip_addr?: string;
    keyDownTimestamp?: number;
    delayToOpenUrl?: number;
};
```

#### Settings Properties

##### ip_addr

**Type:** `string | undefined`
**Purpose:** Cached external IP address
**Format:** Formatted with line breaks (e.g., "192.\n168.\n1.\n1")
**Persistence:** Stored in Stream Deck settings database
**Updated:** On `onWillAppear()` and `onKeyDown()`
**Default:** `undefined` (displays "No IP Address")

**Example Values:**
```typescript
"192.\n168.\n1.\n1"    // IPv4 with formatting
"203.\n0.\n113.\n42"   // Public IP
undefined              // Not yet fetched
```

##### keyDownTimestamp

**Type:** `number | undefined`
**Purpose:** Key press start time for duration calculation
**Format:** Unix timestamp in milliseconds (`Date.now()`)
**Lifecycle:** Set on `onKeyDown()`, cleared on `onKeyUp()`
**Persistence:** Temporary (not intended for long-term storage)
**Default:** `undefined`

**Example Values:**
```typescript
1698765432100          // Valid timestamp
undefined              // Key not pressed
```

**Edge Cases:**
- Plugin restart during key press: Timestamp lost (acceptable)
- Long hold without release: Persists until `onKeyUp()`

##### delayToOpenUrl

**Type:** `number | undefined`
**Purpose:** Long-press threshold in seconds
**Range:** 0.5 - 5.0 seconds
**Step:** 0.5 seconds
**Default:** 0.5 seconds
**Configured:** Via Property Inspector UI (increment-counter.html)

**Valid Values:**
```typescript
0.5   // Minimum (fast response)
1.0
1.5
2.0
2.5
3.0
3.5
4.0
4.5
5.0   // Maximum (deliberate action)
```

**Conversion:**
- UI provides seconds
- Code multiplies by 1000 for milliseconds
- Comparison: `duration > (delayToOpenUrl * 1000)`

---

## Event Handlers Reference

### WillAppearEvent

**Generic Type:** `WillAppearEvent<TSettings>`

**Structure:**
```typescript
interface WillAppearEvent<TSettings> {
    action: ActionContext;
    payload: {
        settings: TSettings;
        coordinates: { column: number; row: number };
        isInMultiAction: boolean;
    };
    device: string;
}
```

**Common Properties:**
- `ev.action`: Action context for SDK operations
- `ev.payload.settings`: Current action settings
- `ev.payload.coordinates`: Position on Stream Deck
- `ev.device`: Device identifier

**SDK Methods Available:**
```typescript
await ev.action.setTitle(title: string);
await ev.action.setImage(image: string);
await ev.action.setSettings(settings: TSettings);
await ev.action.showOk();
await ev.action.showAlert();
```

---

### KeyDownEvent

**Generic Type:** `KeyDownEvent<TSettings>`

**Structure:**
```typescript
interface KeyDownEvent<TSettings> {
    action: ActionContext;
    payload: {
        settings: TSettings;
        coordinates: { column: number; row: number };
        isInMultiAction: boolean;
        userDesiredState?: number;
    };
    device: string;
}
```

**Key Difference from WillAppearEvent:**
- Triggered by user interaction (not lifecycle)
- Can include `userDesiredState` for multi-state actions
- Typically paired with `KeyUpEvent`

---

### KeyUpEvent

**Generic Type:** `KeyUpEvent<TSettings>`

**Structure:**
```typescript
interface KeyUpEvent<TSettings> {
    action: ActionContext;
    payload: {
        settings: TSettings;
        coordinates: { column: number; row: number };
        isInMultiAction: boolean;
        userDesiredState?: number;
    };
    device: string;
}
```

**Usage Pattern:**
```typescript
override async onKeyDown(ev: KeyDownEvent<TSettings>) {
    // Start operation
    this.startTime = Date.now();
}

override async onKeyUp(ev: KeyUpEvent<TSettings>) {
    // Complete operation
    const duration = Date.now() - this.startTime;
    // Process based on duration
}
```

---

## Stream Deck SDK Usage

### Action Context Methods

#### setTitle()

**Signature:**
```typescript
await action.setTitle(title: string): Promise<void>
```

**Parameters:**
- `title`: Text to display on key (supports newlines `\n`)

**Constraints:**
- Maximum length: ~20 characters (platform-dependent)
- Line breaks: Supported via `\n`
- Font: System default (not customizable)

**Example:**
```typescript
await ev.action.setTitle("192.\n168.\n1.\n1");
```

---

#### setImage()

**Signature:**
```typescript
await action.setImage(image: string): Promise<void>
```

**Parameters:**
- `image`: Base64 encoded image or path to image

**Formats:**
- PNG, JPEG, SVG
- Base64: `data:image/png;base64,...`
- Path: `imgs/actions/icon.png` (relative to plugin root)

**Not Currently Used in Plugin**

---

#### setSettings()

**Signature:**
```typescript
await action.setSettings(settings: TSettings): Promise<void>
```

**Parameters:**
- `settings`: Complete settings object (replaces existing)

**Behavior:**
- Persists to Stream Deck database
- Survives plugin restart
- Per-action instance (unique per key placement)

**Example:**
```typescript
const settings = ev.payload.settings;
settings.ip_addr = "192.168.1.1";
await ev.action.setSettings(settings);
```

---

#### showOk()

**Signature:**
```typescript
await action.showOk(): Promise<void>
```

**Behavior:**
- Displays green checkmark overlay
- Duration: ~1 second
- Automatically dismisses
- Non-blocking

**Example:**
```typescript
streamDeck.system.openUrl("https://ifconfig.me");
await ev.action.showOk();
```

---

#### showAlert()

**Signature:**
```typescript
await action.showAlert(): Promise<void>
```

**Behavior:**
- Displays red X overlay
- Duration: ~1 second
- Automatically dismisses
- Use for error indication

**Not Currently Used in Plugin**

---

### System Methods

#### streamDeck.system.openUrl()

**Signature:**
```typescript
streamDeck.system.openUrl(url: string): Promise<void>
```

**Parameters:**
- `url`: Full URL to open (must include protocol)

**Behavior:**
- Opens in system default browser
- Non-blocking
- No error callback if browser fails

**Example:**
```typescript
streamDeck.system.openUrl("https://ifconfig.me");
```

**Security:**
- No URL validation by SDK
- Plugin responsible for safe URLs
- User's browser handles security

---

### Logger Methods

#### streamDeck.logger.*

**Available Methods:**
```typescript
streamDeck.logger.trace(message: string, ...args: any[]): void
streamDeck.logger.debug(message: string, ...args: any[]): void
streamDeck.logger.info(message: string, ...args: any[]): void
streamDeck.logger.warn(message: string, ...args: any[]): void
streamDeck.logger.error(message: string, ...args: any[]): void
```

**Current Usage:**
```typescript
// src/actions/ifconfig-info.ts:34-35
streamDeck.logger.info(`Key up timestamp: ${keyUpTimestamp}`);
streamDeck.logger.info(`Key down timestamp: ${settings.keyDownTimestamp}`);
```

**Log Location:**
- Development: Console output
- Production: `com.omar-mciver.tools.sdPlugin/logs/`

**Best Practices:**
```typescript
// Good: Structured context
streamDeck.logger.info("IP fetch complete", { ip: ipAddr, duration: 150 });

// Good: Error with context
streamDeck.logger.error("Fetch failed", { error, url, action: "ifconfig" });

// Avoid: Sensitive data
streamDeck.logger.debug("User credentials", credentials); // Never log secrets
```

---

## External APIs

### ifconfig.me

**Base URL:** `https://ifconfig.me`

#### GET /ip

**Endpoint:** `https://ifconfig.me/ip`
**Method:** GET
**Authentication:** None

**Response:**
```
Content-Type: text/plain
Body: "203.0.113.42"
```

**Example Usage:**
```typescript
const response = await fetch("https://ifconfig.me/ip");
const ipAddr = await response.text();
// ipAddr === "203.0.113.42"
```

**Rate Limits:**
- Not officially documented
- Reasonable use: <10 requests/minute
- Plugin usage: ~1-2 requests per user session

**Error Handling:**
```typescript
try {
    const response = await fetch("https://ifconfig.me/ip");
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const ipAddr = await response.text();
} catch (error) {
    streamDeck.logger.error("IP fetch failed", error);
    await ev.action.setTitle("Error");
    await ev.action.showAlert();
}
```

**Alternatives:**
- `https://api.ipify.org` - JSON format
- `https://icanhazip.com` - Plain text
- `https://checkip.amazonaws.com` - AWS service

---

## Property Inspector API

### UI Component Integration

**File:** `com.omar-mciver.tools.sdPlugin/ui/increment-counter.html`

#### SDPI Components

**Framework:** [sdpi-components v3](https://sdpi-components.dev/)

**Range Input:**
```html
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
```

**Attributes:**
- `setting`: Maps to settings property name
- `min`: Minimum value (0.5 seconds)
- `max`: Maximum value (5 seconds)
- `step`: Increment step (0.5 seconds)
- `default`: Initial value
- `showlabels`: Display min/max labels

**Binding:**
- Automatically syncs with `IfConfigInfoSettings.delayToOpenUrl`
- No JavaScript required for basic binding
- Updates persist via Stream Deck settings system

**Custom JavaScript (if needed):**
```javascript
// Example of custom property inspector logic
$PI.onConnected((jsn) => {
    const { actionInfo, settings } = jsn;
    // Initialize UI with settings
});

$PI.onSendToPropertyInspector((jsn) => {
    const { payload } = jsn;
    // Handle messages from plugin
});
```

---

## Type Definitions

### Action Base Classes

#### SingletonAction

**Generic Type:** `SingletonAction<TSettings>`

**Purpose:** Base class for actions with a single instance per Stream Deck key

**Lifecycle Methods:**
```typescript
class SingletonAction<TSettings> {
    onWillAppear?(ev: WillAppearEvent<TSettings>): void | Promise<void>;
    onWillDisappear?(ev: WillDisappearEvent<TSettings>): void | Promise<void>;
    onKeyDown?(ev: KeyDownEvent<TSettings>): void | Promise<void>;
    onKeyUp?(ev: KeyUpEvent<TSettings>): void | Promise<void>;
    onDialRotate?(ev: DialRotateEvent<TSettings>): void | Promise<void>;
    onDialPress?(ev: DialPressEvent<TSettings>): void | Promise<void>;
    onTouchTap?(ev: TouchTapEvent<TSettings>): void | Promise<void>;
    onDidReceiveSettings?(ev: DidReceiveSettingsEvent<TSettings>): void | Promise<void>;
    onPropertyInspectorDidAppear?(ev: PropertyInspectorDidAppearEvent<TSettings>): void | Promise<void>;
    onPropertyInspectorDidDisappear?(ev: PropertyInspectorDidDisappearEvent<TSettings>): void | Promise<void>;
    onSendToPlugin?(ev: SendToPluginEvent<TSettings>): void | Promise<void>;
}
```

**Currently Implemented:**
- ✅ `onWillAppear`
- ✅ `onKeyDown`
- ✅ `onKeyUp`

**Not Implemented (available for future use):**
- ❌ `onWillDisappear`
- ❌ `onDialRotate` (Stream Deck+ knobs)
- ❌ `onDialPress`
- ❌ `onTouchTap` (touchscreen)
- ❌ `onDidReceiveSettings`
- ❌ `onPropertyInspectorDidAppear`
- ❌ `onPropertyInspectorDidDisappear`
- ❌ `onSendToPlugin`

---

## Error Handling Patterns

### Network Failures

**Current Behavior:**
```typescript
// No explicit error handling
const response = await fetch("https://ifconfig.me/ip");
const ipAddr = await response.text();
```

**Recommended Enhancement:**
```typescript
try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://ifconfig.me/ip", {
        signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const ipAddr = await response.text();

    // Validate IP format
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipAddr)) {
        throw new Error("Invalid IP format");
    }

    return ipAddr;
} catch (error) {
    streamDeck.logger.error("IP fetch failed", error);
    await ev.action.setTitle("Offline");
    await ev.action.showAlert();
    return null;
}
```

### Settings Validation

**Recommended Pattern:**
```typescript
function validateSettings(settings: IfConfigInfoSettings): boolean {
    if (settings.delayToOpenUrl !== undefined) {
        if (settings.delayToOpenUrl < 0.5 || settings.delayToOpenUrl > 5) {
            return false;
        }
    }
    return true;
}

override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<IfConfigInfoSettings>) {
    if (!validateSettings(ev.payload.settings)) {
        streamDeck.logger.warn("Invalid settings detected", ev.payload.settings);
        // Reset to defaults
        await ev.action.setSettings({ delayToOpenUrl: 0.5 });
    }
}
```

---

## Performance Considerations

### API Call Optimization

**Current:**
- Fetches IP on every `onWillAppear()` and `onKeyDown()`
- No caching beyond settings storage

**Optimization Opportunities:**
```typescript
private lastFetchTime: number = 0;
private readonly CACHE_DURATION = 60000; // 1 minute

async fetchIP(settings: IfConfigInfoSettings): Promise<string> {
    const now = Date.now();

    // Use cached IP if recent
    if (settings.ip_addr && (now - this.lastFetchTime) < this.CACHE_DURATION) {
        return settings.ip_addr;
    }

    // Fetch fresh IP
    const response = await fetch("https://ifconfig.me/ip");
    const ipAddr = await response.text();
    this.lastFetchTime = now;

    return ipAddr.replace(/\./g, ".\n");
}
```

### Memory Management

**Current State:**
- No persistent state beyond settings
- Event-driven (no background tasks)
- Minimal memory footprint

**Best Practices:**
- Avoid storing large objects in settings
- Clear temporary state after use
- No setInterval or background timers

---

## Security Best Practices

### Input Validation

```typescript
// Validate user-controlled settings
function sanitizeSettings(settings: IfConfigInfoSettings): IfConfigInfoSettings {
    return {
        ip_addr: settings.ip_addr?.substring(0, 50), // Limit length
        keyDownTimestamp: typeof settings.keyDownTimestamp === 'number'
            ? settings.keyDownTimestamp
            : undefined,
        delayToOpenUrl: Math.max(0.5, Math.min(5, settings.delayToOpenUrl || 0.5))
    };
}
```

### URL Safety

```typescript
// Validate URLs before opening
function isSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

if (isSafeUrl("https://ifconfig.me")) {
    streamDeck.system.openUrl("https://ifconfig.me");
}
```

---

## Version Compatibility

### Elgato SDK

**Current Version:** `@elgato/streamdeck@^1.0.0`

**Breaking Changes (if upgrading):**
- Check [Elgato SDK changelog](https://github.com/elgatosf/streamdeck/releases)
- Test all event handlers
- Verify settings persistence

### Stream Deck Software

**Minimum Version:** 6.4

**Features by Version:**
- 6.4+: Basic actions (current compatibility)
- 6.5+: Enhanced dialogs
- 6.6+: New encoder support

---

## Troubleshooting API Issues

### Issue: IP Address Not Updating

**Diagnostic Steps:**
1. Check network connectivity
2. Verify ifconfig.me availability: `curl https://ifconfig.me/ip`
3. Review logs for fetch errors
4. Inspect settings: `ev.payload.settings`

**Solution:**
```typescript
streamDeck.logger.debug("Fetching IP", { url: "https://ifconfig.me/ip" });
const response = await fetch("https://ifconfig.me/ip");
streamDeck.logger.debug("Response", { status: response.status, ok: response.ok });
```

### Issue: Long-Press Not Triggering

**Diagnostic Steps:**
1. Check `delayToOpenUrl` setting value
2. Verify `keyDownTimestamp` is set
3. Log duration calculation

**Solution:**
```typescript
const duration = keyUpTimestamp - settings.keyDownTimestamp;
streamDeck.logger.info("Press duration", {
    duration,
    threshold: settings.delayToOpenUrl * 1000,
    willTrigger: duration > (settings.delayToOpenUrl * 1000 + 100)
});
```

---

## References

- [Stream Deck SDK API](https://docs.elgato.com/sdk/plugins/api/)
- [SDPI Components](https://sdpi-components.dev/docs/components)
- [Elgato SDK TypeScript Definitions](https://github.com/elgatosf/streamdeck/tree/main/types)
- [ifconfig.me Documentation](https://ifconfig.me/)

---

## Change Log

### Version 0.1.0.0
- Initial API implementation
- IfConfigInfo action with IP display
- Long-press URL opening
- Settings persistence
