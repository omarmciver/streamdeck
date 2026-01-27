# Omar's Stream Deck Tools Plugin

A custom Stream Deck plugin collection providing utility actions for enhanced productivity and system information display.

## Overview

**Plugin Name:** tools
**Version:** 0.1.0.0
**Author:** Omar McIver
**Category:** Omar's Tools
**UUID:** `com.omar-mciver.tools`

This plugin provides custom actions for the Elgato Stream Deck, currently featuring IP address display and monitoring functionality.

## Features

### IP Address Action (`com.omar-mciver.tools.ifconfig`)

Displays your current external IP address on a Stream Deck key with automatic updates and interactive URL opening.

**Key Features:**
- Automatic IP address retrieval from ifconfig.me
- Formatted display with line breaks for readability
- Manual refresh on key press
- Long-press to open ifconfig.me in browser (configurable hold delay)
- Visual feedback during updates

**Configuration:**
- **Hold delay:** 0.5-5 seconds (default: 0.5s) - Duration required to trigger URL opening

## Requirements

- **Stream Deck Software:** Minimum version 6.4
- **Operating Systems:**
  - macOS 10.15 or later
  - Windows 10 or later
- **Node.js:** Version 20 (bundled with plugin)

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd streamdeck
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the plugin:
   ```bash
   pnpm build
   ```

4. Install to Stream Deck:
   ```bash
   streamdeck install com.omar-mciver.tools
   ```

### Development Mode

For active development with hot-reload:

```bash
pnpm watch
```

This command builds the plugin and automatically restarts it on changes.

## Project Structure

```
streamdeck/
├── src/
│   ├── plugin.ts              # Main plugin entry point
│   └── actions/
│       └── ifconfig-info.ts   # IP address action implementation
├── com.omar-mciver.tools.sdPlugin/
│   ├── manifest.json          # Plugin manifest and metadata
│   ├── bin/                   # Compiled plugin code
│   ├── imgs/                  # Plugin icons and images
│   └── ui/                    # Property inspector UI
│       └── increment-counter.html
├── package.json               # NPM dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── rollup.config.mjs         # Build configuration

```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Development

### Technology Stack

- **Language:** TypeScript (ES2022)
- **Runtime:** Node.js 20
- **Build Tool:** Rollup with TypeScript plugin
- **Framework:** @elgato/streamdeck SDK v1.0.0
- **Package Manager:** pnpm v10.6.5

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build the plugin for production |
| `pnpm watch` | Build and watch for changes with auto-restart |
| `pnpm prettier` | Format code with Prettier |

### Adding New Actions

1. Create action class in `src/actions/`:
   ```typescript
   import { action, SingletonAction } from "@elgato/streamdeck";

   @action({ UUID: "com.omar-mciver.tools.your-action" })
   export class YourAction extends SingletonAction {
       // Implementation
   }
   ```

2. Register in `src/plugin.ts`:
   ```typescript
   import { YourAction } from "./actions/your-action";
   streamDeck.actions.registerAction(new YourAction());
   ```

3. Add action definition to `manifest.json`:
   ```json
   {
       "Name": "Your Action Name",
       "UUID": "com.omar-mciver.tools.your-action",
       "Icon": "imgs/actions/your-action/icon",
       "PropertyInspectorPath": "ui/your-action.html",
       "Controllers": ["Keypad"],
       "States": [...]
   }
   ```

See [API_REFERENCE.md](docs/API_REFERENCE.md) for detailed API documentation.

## Architecture

The plugin follows Elgato's Stream Deck SDK patterns:

- **Plugin Entry:** `src/plugin.ts` initializes SDK and registers actions
- **Action Pattern:** Each action extends `SingletonAction` with event handlers
- **Settings Management:** Type-safe settings interfaces per action
- **Event-Driven:** Responds to Stream Deck lifecycle events (onWillAppear, onKeyDown, onKeyUp)

### Build Process

1. **TypeScript Compilation:** Source code compiled to ES2022
2. **Bundling:** Rollup combines modules into single output
3. **Output:** Generated to `com.omar-mciver.tools.sdPlugin/bin/plugin.js`
4. **Watch Mode:** Hot-reload via Rollup watch + Stream Deck restart

## Troubleshooting

### Plugin Not Appearing

1. Check Stream Deck software version (minimum 6.4)
2. Verify plugin installation: `streamdeck list`
3. Check logs in `com.omar-mciver.tools.sdPlugin/logs/`

### Build Errors

1. Ensure Node.js 20 is installed
2. Clear node_modules: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
3. Verify TypeScript compilation: `pnpm tsc --noEmit`

### IP Address Not Displaying

1. Check internet connectivity
2. Verify ifconfig.me service availability
3. Review Stream Deck logs for fetch errors
4. Ensure firewall allows outbound HTTPS connections

## Contributing

This is a private development project. For issues or enhancement ideas:

1. Document the issue with reproduction steps
2. Include Stream Deck software version and OS
3. Attach relevant logs from `com.omar-mciver.tools.sdPlugin/logs/`

## License

Private project - All rights reserved by Omar McIver

## Resources

- [Stream Deck SDK Documentation](https://docs.elgato.com/sdk/)
- [Elgato Stream Deck SDK (NPM)](https://www.npmjs.com/package/@elgato/streamdeck)
- [SDPI Components](https://sdpi-components.dev/)
- [Stream Deck CLI](https://www.npmjs.com/package/@elgato/cli)

## Version History

### 0.1.0.0 (Current)
- Initial release
- IP Address action with ifconfig.me integration
- Configurable long-press URL opening
- Automatic IP refresh on key appearance and press
