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
		// Update the count from the settings.
		const { settings } = ev.payload;
		const response = await fetch("https://ifconfig.me/ip");
		const ipAddr = await response.text();
		settings.ip_addr = ipAddr.replace(/\./g, ".\n");
		settings.keyDownTimestamp = Date.now();
		console.log(settings.keyDownTimestamp);

		// Update the current count in the action's settings, and change the title.
		await ev.action.setSettings(settings);
		return ev.action.setTitle(`${ev.payload.settings.ip_addr ?? "No IP Address"}`);
	}

	override async onKeyUp(ev: KeyUpEvent<IfConfigInfoSettings>): Promise<void> {
		// Calculate the duration the key was pressed
		const { settings } = ev.payload;
		const keyUpTimestamp = Date.now();
		const duration = settings.keyDownTimestamp ? keyUpTimestamp - settings.keyDownTimestamp : 0;
		console.log(duration);
		// Check if the key was pressed for more than a second
		if (duration > 1000) {
			streamDeck.system.openUrl("https://ifconfig.me");
		}
		else {
			// return ev.action.setTitle(`${duration.toString()}`);
		}
	}
}

/**
 * Settings for {@link IfConfigInfo}.
 */
type IfConfigInfoSettings = {
	ip_addr?: string;
	keyDownTimestamp?: number;
};
