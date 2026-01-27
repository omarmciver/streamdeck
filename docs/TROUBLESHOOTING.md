# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Plugin Not Appearing in Stream Deck

**Symptoms:**
- Plugin doesn't show in Stream Deck actions list
- Actions panel shows no "Omar's Tools" category

**Possible Causes:**
1. Plugin not installed
2. Stream Deck software version too old
3. Manifest.json errors
4. Plugin installation corrupted

**Solutions:**

**Check Installation:**
```bash
streamdeck list
# Should show: com.omar-mciver.tools
```

**Verify Stream Deck Version:**
- Open Stream Deck → Preferences → General
- Ensure version is 6.4 or higher
- Update if necessary from [Elgato website](https://www.elgato.com/downloads)

**Validate Manifest:**
```bash
cat com.omar-mciver.tools.sdPlugin/manifest.json | jq
# Should parse without errors
```

**Reinstall Plugin:**
```bash
streamdeck install com.omar-mciver.tools --force
```

**Restart Stream Deck:**
- Quit Stream Deck application completely
- Restart from Applications folder or Start menu

---

#### Plugin Installation Fails

**Symptoms:**
- `streamdeck install` command fails
- Error messages about permissions or file access

**Solutions:**

**Check File Permissions:**
```bash
# macOS/Linux
chmod -R 755 com.omar-mciver.tools.sdPlugin/
```

**Verify Build Completion:**
```bash
ls -l com.omar-mciver.tools.sdPlugin/bin/plugin.js
# File should exist and have non-zero size
```

**Clean and Rebuild:**
```bash
rm -rf com.omar-mciver.tools.sdPlugin/bin/
pnpm build
streamdeck install com.omar-mciver.tools
```

**Windows-Specific:**
- Run terminal as Administrator
- Disable antivirus temporarily
- Check Windows Defender logs for blocks

---

### Build Issues

#### TypeScript Compilation Errors

**Symptoms:**
```
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
error TS2339: Property 'ip_addr' does not exist on type '{}'
```

**Solutions:**

**Verify TypeScript Version:**
```bash
pnpm list typescript
# Should be 5.2.2 or compatible
```

**Check tsconfig.json:**
```bash
cat tsconfig.json | jq
# Ensure "extends": "@tsconfig/node20/tsconfig.json"
```

**Reinstall Dependencies:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Clear TypeScript Cache:**
```bash
rm -rf .tsbuildinfo
pnpm build
```

---

#### Rollup Build Fails

**Symptoms:**
```
[!] Error: Could not resolve '@elgato/streamdeck'
[!] RollupError: Could not load src/plugin.ts
```

**Solutions:**

**Verify Dependencies Installed:**
```bash
ls node_modules/@elgato/streamdeck
# Directory should exist with package files
```

**Check Node Version:**
```bash
node --version
# Should be v20.x.x
```

**Validate rollup.config.mjs:**
```bash
node rollup.config.mjs
# Should execute without syntax errors
```

**Clean Build:**
```bash
rm -rf com.omar-mciver.tools.sdPlugin/bin/
rm -rf node_modules/.rollup-cache
pnpm build
```

---

### Runtime Issues

#### IP Address Not Displaying

**Symptoms:**
- Key shows "No IP Address"
- IP doesn't update on key press
- Stale IP address displayed

**Diagnosis Steps:**

**1. Check Network Connectivity:**
```bash
curl -v https://ifconfig.me/ip
# Should return your IP address
```

**2. Review Logs:**
```bash
tail -n 50 com.omar-mciver.tools.sdPlugin/logs/plugin.log
# Look for fetch errors or network timeouts
```

**3. Test API Manually:**
```bash
curl -w "\n%{http_code}" https://ifconfig.me/ip
# Should show IP followed by "200"
```

**Solutions:**

**Network Issues:**
- Check firewall settings (allow HTTPS outbound)
- Verify no VPN or proxy blocking requests
- Try alternative API: `https://api.ipify.org`

**DNS Issues:**
```bash
# Test DNS resolution
nslookup ifconfig.me

# Try with different DNS
dig @8.8.8.8 ifconfig.me
```

**Code Fix (if API unreliable):**
```typescript
// Add fallback in src/actions/ifconfig-info.ts
const apis = [
    "https://ifconfig.me/ip",
    "https://api.ipify.org",
    "https://icanhazip.com"
];

for (const api of apis) {
    try {
        const response = await fetch(api);
        if (response.ok) {
            return await response.text();
        }
    } catch (error) {
        streamDeck.logger.warn(`API ${api} failed`, error);
    }
}
```

---

#### Long-Press Not Working

**Symptoms:**
- Holding key doesn't open URL
- URL opens too easily (or not at all)
- Inconsistent behavior

**Diagnosis:**

**Check Settings:**
1. Right-click action in Stream Deck
2. Select "Edit" or click gear icon
3. Verify "Hold delay" value (0.5-5.0 seconds)

**Enable Debug Logging:**
```typescript
// Temporarily add to src/actions/ifconfig-info.ts:29-48
const duration = settings.keyDownTimestamp
    ? (keyUpTimestamp - settings.keyDownTimestamp)
    : 0;

streamDeck.logger.info("Long-press check", {
    duration,
    threshold: settings.delayToOpenUrl * 1000,
    willTrigger: duration - 100 > (settings.delayToOpenUrl * 1000)
});
```

**Rebuild and Test:**
```bash
pnpm build
streamdeck restart com.omar-mciver.tools
```

**Solutions:**

**Adjust Threshold:**
- Increase `delayToOpenUrl` if triggering accidentally
- Decrease if too difficult to trigger
- Default: 0.5 seconds, typical: 1.0-2.0 seconds

**Fix Timestamp Issues:**
```typescript
// Ensure timestamp is always cleared
override async onKeyUp(ev: KeyUpEvent<IfConfigInfoSettings>): Promise<void> {
    try {
        // Existing logic
    } finally {
        // Always clear timestamp
        const settings = ev.payload.settings;
        settings.keyDownTimestamp = undefined;
        await ev.action.setSettings(settings);
    }
}
```

---

#### Plugin Crashes or Becomes Unresponsive

**Symptoms:**
- Actions stop responding
- Stream Deck shows "Unavailable"
- No logs generated

**Immediate Actions:**

**Restart Plugin:**
```bash
streamdeck restart com.omar-mciver.tools
```

**Check Logs for Errors:**
```bash
tail -n 100 com.omar-mciver.tools.sdPlugin/logs/plugin.log | grep -i error
```

**Review System Resources:**
```bash
# macOS
top -pid $(pgrep -f com.omar-mciver.tools)

# Linux
ps aux | grep com.omar-mciver.tools

# Windows
tasklist | findstr node
```

**Solutions:**

**Memory Leak Detection:**
```typescript
// Add memory logging in src/plugin.ts
setInterval(() => {
    const usage = process.memoryUsage();
    streamDeck.logger.debug("Memory usage", {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + "MB",
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + "MB"
    });
}, 60000); // Every minute
```

**Add Error Boundaries:**
```typescript
// Wrap event handlers in try-catch
override async onKeyDown(ev: KeyDownEvent<IfConfigInfoSettings>): Promise<void> {
    try {
        // Existing logic
    } catch (error) {
        streamDeck.logger.error("onKeyDown failed", { error });
        await ev.action.showAlert();
        // Don't rethrow - prevent plugin crash
    }
}
```

**Timeout Long Operations:**
```typescript
async fetchWithTimeout(url: string, timeout: number = 5000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
```

---

### Development Issues

#### Watch Mode Not Working

**Symptoms:**
- Code changes don't trigger rebuild
- Plugin not restarting automatically
- No console output on save

**Solutions:**

**Verify Watch Command:**
```bash
# Check package.json scripts
cat package.json | jq '.scripts.watch'
# Should be: "rollup -c -w --watch.onEnd=\"streamdeck restart com.omar-mciver.tools\""
```

**Check File Watchers:**
```bash
# macOS - increase file watch limit
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536

# Linux - increase inotify limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Manual Watch Test:**
```bash
# Start watch mode with verbose output
ROLLUP_WATCH=true pnpm build --watch
```

**Alternative: Use Manual Restart:**
```bash
# Terminal 1: Build on change
pnpm build --watch

# Terminal 2: Manually restart when needed
streamdeck restart com.omar-mciver.tools
```

---

#### Hot-Reload Breaks Settings

**Symptoms:**
- Settings reset after plugin restart
- Configured values disappear
- Actions lose state

**Root Cause:**
- Settings are preserved by Stream Deck, not plugin
- Issue likely in settings initialization logic

**Solutions:**

**Never Reset Settings on Appearance:**
```typescript
// WRONG - overwrites existing settings
override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    ev.payload.settings = { defaultValue: 123 }; // ❌ Overwrites user settings
    await ev.action.setSettings(ev.payload.settings);
}

// RIGHT - preserve existing settings
override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    const settings = ev.payload.settings;

    // Only set if undefined
    if (settings.value === undefined) {
        settings.value = 123;
        await ev.action.setSettings(settings);
    }
}
```

**Verify Settings Persistence:**
```typescript
override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<Settings>
): Promise<void> {
    streamDeck.logger.info("Settings received", { settings: ev.payload.settings });
}
```

---

### Performance Issues

#### Slow Response Times

**Symptoms:**
- Delay between key press and response
- "Asking..." message lingers
- IP update takes >5 seconds

**Diagnosis:**

**Measure Timing:**
```typescript
override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    const start = Date.now();

    await ev.action.setTitle("Asking...");
    const fetchStart = Date.now();

    const response = await fetch("https://ifconfig.me/ip");
    const fetchEnd = Date.now();

    const ipAddr = await response.text();
    await ev.action.setTitle(ipAddr.replace(/\./g, ".\n"));

    const end = Date.now();

    streamDeck.logger.info("Performance", {
        totalMs: end - start,
        fetchMs: fetchEnd - fetchStart,
        uiMs: (end - start) - (fetchEnd - fetchStart)
    });
}
```

**Solutions:**

**Reduce Network Latency:**
```typescript
// Use faster API endpoint
const response = await fetch("https://api.ipify.org?format=text");
```

**Implement Caching:**
```typescript
private cache: { ip: string; timestamp: number } | null = null;
private readonly CACHE_TTL = 60000; // 1 minute

async getIP(): Promise<string> {
    const now = Date.now();

    if (this.cache && (now - this.cache.timestamp) < this.CACHE_TTL) {
        return this.cache.ip;
    }

    const response = await fetch("https://ifconfig.me/ip");
    const ip = await response.text();

    this.cache = { ip, timestamp: now };
    return ip;
}
```

**Optimize Repeated Operations:**
```typescript
// Debounce rapid key presses
private debounceTimer: NodeJS.Timeout | null = null;

override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
        await this.fetchAndUpdate(ev);
    }, 500);
}
```

---

#### High Memory Usage

**Symptoms:**
- Plugin consumes >100MB RAM
- Memory grows over time
- System slowdown with plugin active

**Diagnosis:**
```bash
# Monitor memory over time
while true; do
    echo "$(date): $(ps aux | grep 'com.omar-mciver.tools' | grep -v grep | awk '{print $6}') KB"
    sleep 10
done
```

**Solutions:**

**Clear Caches Periodically:**
```typescript
private cache = new Map<string, any>();

clearOldCacheEntries(): void {
    const now = Date.now();
    const maxAge = 600000; // 10 minutes

    for (const [key, value] of this.cache) {
        if (now - value.timestamp > maxAge) {
            this.cache.delete(key);
        }
    }
}

// Call periodically
setInterval(() => this.clearOldCacheEntries(), 60000);
```

**Avoid Memory Leaks:**
```typescript
// ❌ BAD - timer not cleared
override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    setInterval(() => {
        // This runs forever even after action removed!
    }, 1000);
}

// ✅ GOOD - cleanup on disappear
private timer: NodeJS.Timeout | null = null;

override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    this.timer = setInterval(() => {
        // Periodic task
    }, 1000);
}

override async onWillDisappear(ev: WillDisappearEvent<Settings>): Promise<void> {
    if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
    }
}
```

---

## Error Messages Reference

### Common Error Patterns

#### "Cannot read property 'settings' of undefined"

**Cause:** Accessing settings before event initialization

**Solution:**
```typescript
// Add null checks
override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    if (!ev?.payload?.settings) {
        streamDeck.logger.warn("No settings available");
        return;
    }

    const { settings } = ev.payload;
    // Safe to use settings now
}
```

---

#### "CORS policy blocked the request"

**Cause:** Browser security restrictions (shouldn't occur in Node.js)

**Solution:**
- Verify fetch is running in Node.js context (not browser)
- Ensure plugin.js is loaded by Stream Deck, not web browser

---

#### "AbortError: The operation was aborted"

**Cause:** Fetch timeout exceeded

**Solution:**
```typescript
try {
    const response = await this.fetchWithTimeout(url, 10000); // 10s timeout
} catch (error) {
    if (error.name === 'AbortError') {
        streamDeck.logger.error("Request timed out", { url });
        await ev.action.setTitle("Timeout");
        await ev.action.showAlert();
    }
}
```

---

#### "Unexpected token in JSON at position X"

**Cause:** Invalid manifest.json syntax

**Solution:**
```bash
# Validate JSON
cat com.omar-mciver.tools.sdPlugin/manifest.json | jq .

# Common issues:
# - Trailing commas
# - Unescaped quotes
# - Missing brackets
```

---

## Platform-Specific Issues

### macOS

#### Gatekeeper Blocking Plugin

**Symptoms:**
- "Cannot be opened because it is from an unidentified developer"

**Solution:**
```bash
# Remove quarantine attribute
xattr -dr com.apple.quarantine com.omar-mciver.tools.sdPlugin/

# Reinstall
streamdeck install com.omar-mciver.tools
```

---

### Windows

#### Antivirus Blocking Plugin

**Symptoms:**
- Plugin installation fails silently
- Files deleted after build

**Solution:**
1. Open Windows Security
2. Add exclusion: `%APPDATA%\Elgato\StreamDeck\Plugins\`
3. Add exclusion: Project directory
4. Rebuild and reinstall

---

#### Path Length Limit

**Symptoms:**
- Build fails with "path too long" errors

**Solution:**
```powershell
# Enable long path support (Administrator)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

---

### Linux

#### Stream Deck Not Detecting Plugin

**Symptoms:**
- Plugin installs but doesn't appear

**Solution:**
```bash
# Ensure Stream Deck has file permissions
chmod -R 755 ~/.config/Elgato/StreamDeck/Plugins/

# Restart Stream Deck service
systemctl --user restart streamdeck
```

---

## Getting Help

### Gathering Diagnostic Information

**Before Reporting Issues:**

1. **Collect Logs:**
   ```bash
   # Copy plugin logs
   cat com.omar-mciver.tools.sdPlugin/logs/plugin.log > diagnostic.txt

   # Add system info
   echo "OS: $(uname -a)" >> diagnostic.txt
   echo "Node: $(node --version)" >> diagnostic.txt
   echo "Stream Deck: $(streamdeck --version)" >> diagnostic.txt
   ```

2. **Test Network:**
   ```bash
   curl -v https://ifconfig.me/ip >> diagnostic.txt
   ```

3. **Verify Build:**
   ```bash
   pnpm build 2>&1 | tee build.log
   ```

4. **Check Manifest:**
   ```bash
   cat com.omar-mciver.tools.sdPlugin/manifest.json >> diagnostic.txt
   ```

---

### Where to Get Help

**Official Resources:**
- [Stream Deck SDK Documentation](https://docs.elgato.com/sdk/)
- [Elgato Developer Forums](https://forums.elgato.com/forum/stream-deck-forum)

**Project Documentation:**
- [README.md](../README.md) - Overview and quick start
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [API_REFERENCE.md](API_REFERENCE.md) - Detailed API docs
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Development workflows

---

## Prevention Strategies

### Code Quality

**Use TypeScript Strict Mode:**
```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true
    }
}
```

**Add Linting:**
```bash
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint
```

### Testing Checklist

**Before Committing:**
- [ ] Build completes: `pnpm build`
- [ ] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] Code formatted: `pnpm prettier`
- [ ] Plugin loads in Stream Deck
- [ ] All actions functional
- [ ] No console errors in logs
- [ ] Settings persist correctly

### Monitoring

**Add Health Checks:**
```typescript
// src/plugin.ts
streamDeck.onConnected(() => {
    streamDeck.logger.info("Plugin connected successfully", {
        version: "0.1.0.0",
        timestamp: new Date().toISOString()
    });
});

streamDeck.onDisconnected(() => {
    streamDeck.logger.warn("Plugin disconnected");
});
```

---

## Quick Reference

### Emergency Recovery

**Plugin Completely Broken:**
```bash
# Nuclear option - full reset
streamdeck uninstall com.omar-mciver.tools
rm -rf com.omar-mciver.tools.sdPlugin/bin/
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
streamdeck install com.omar-mciver.tools
```

**Stream Deck Won't Start:**
```bash
# macOS
killall "Stream Deck"
open -a "Stream Deck"

# Windows
taskkill /F /IM "Stream Deck.exe"
# Restart from Start menu

# Linux
systemctl --user restart streamdeck
```

**Settings Lost:**
```bash
# Settings stored by Stream Deck - check backups
ls ~/Library/Application\ Support/com.elgato.StreamDeck/
```

