import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { IfConfigInfo } from "./actions/ifconfig-info";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the ifconfig action.
streamDeck.actions.registerAction(new IfConfigInfo());

// Finally, connect to the Stream Deck.
streamDeck.connect();