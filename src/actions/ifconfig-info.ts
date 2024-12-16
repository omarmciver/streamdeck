import streamDeck, { action, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.omar-mciver.tools.ifconfig" })
export class IfConfigInfo extends SingletonAction<IfConfigInfoSettings> {
	override async onWillAppear(ev: WillAppearEvent<IfConfigInfoSettings>) {
		const response = await fetch("https://ifconfig.me/ip");
		const ipAddr = await response.text();
		ev.payload.settings.ip_addr = ipAddr.replace(/\./g, ".\n");
		await ev.action.setSettings(ev.payload.settings);
		return ev.action.setTitle(`${ev.payload.settings.ip_addr ?? "No IP Address"}`);
	}

	override async onKeyDown(ev: KeyDownEvent<IfConfigInfoSettings>): Promise<void> {
		await ev.action.setTitle("Asking...");
		const { settings } = ev.payload;
		settings.keyDownTimestamp = Date.now();
		await ev.action.setSettings(settings);
		setTimeout(async () => {
			// Update the count from the settings.
			const response = await fetch("https://ifconfig.me/ip");
			const ipAddr = await response.text();
			settings.ip_addr = ipAddr.replace(/\./g, ".\n");
			// Update the current count in the action's settings, and change the title.
			await ev.action.setSettings(settings);
			await ev.action.setTitle(`${ev.payload.settings.ip_addr ?? "No IP Address"}`);
		}, 500);
	}

	override async onKeyUp(ev: KeyUpEvent<IfConfigInfoSettings>): Promise<void> {
		// Calculate the duration the key was pressed
		const { settings } = ev.payload;
		if (settings.delayToOpenUrl) {
			const keyUpTimestamp = Date.now();
			streamDeck.logger.info(`Key up timestamp: ${keyUpTimestamp}`);
			streamDeck.logger.info(`Key down timestamp: ${settings.keyDownTimestamp}`);
			const duration = settings.keyDownTimestamp ? (keyUpTimestamp - settings.keyDownTimestamp) : 0;
			// Check if the key was pressed for more than a second
			if (duration - 100 > (settings.delayToOpenUrl * 1000)) {
				streamDeck.system.openUrl("https://ifconfig.me");
				await ev.action.showOk();
			}
			else {

			}
		}
		settings.keyDownTimestamp = undefined
		await ev.action.setSettings(settings);
	}
}

/**
 * Settings for {@link IfConfigInfo}.
 */
type IfConfigInfoSettings = {
	ip_addr?: string;
	keyDownTimestamp?: number;
	delayToOpenUrl?: number;
};
