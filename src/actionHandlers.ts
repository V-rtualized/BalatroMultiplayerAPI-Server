import type Client from "./Client.js";
import GameModes from "./GameMode.js";
import Lobby, { getEnemy } from "./Lobby.js";
import type {
	ActionCreateLobby,
	ActionEatPizza,
	ActionHandlerArgs,
	ActionHandlers,
	ActionJoinLobby,
	ActionMagnet,
	ActionMagnetResponse,
	ActionPlayHand,
	ActionRemovePhantom,
	ActionSendPhantom,
	ActionSetAnte,
	ActionSetLocation,
	ActionSkip,
	ActionSpentLastShop,
	ActionUsername,
	ActionVersion,
} from "./actions.js";
import { generateSeed } from "./utils.js";

const usernameAction = (
	{ username, modHash }: ActionHandlerArgs<ActionUsername>,
	client: Client,
) => {
	client.setUsername(username);
	client.setModHash(modHash);
};

const createLobbyAction = (
	{ gameMode }: ActionHandlerArgs<ActionCreateLobby>,
	client: Client,
) => {
	/** Also sets the client lobby to this newly created one */
	new Lobby(client, gameMode);
};

const joinLobbyAction = (
	{ code }: ActionHandlerArgs<ActionJoinLobby>,
	client: Client,
) => {
	const newLobby = Lobby.get(code);
	if (!newLobby) {
		client.sendAction({
			action: "error",
			message: "Lobby does not exist.",
		});
		return;
	}
	newLobby.join(client);
};

const leaveLobbyAction = (client: Client) => {
	client.lobby?.leave(client);
};

const lobbyInfoAction = (client: Client) => {
	client.lobby?.broadcastLobbyInfo();
};

const keepAliveAction = (client: Client) => {
	// Send an ack back to the received keepAlive
	client.sendAction({ action: "keepAliveAck" });
};

const startGameAction = (client: Client) => {
	const lobby = client.lobby;
	// Only allow the host to start the game
	if (!lobby || lobby.host?.id !== client.id) {
		return;
	}

	const lives = lobby.options.starting_lives
		? Number.parseInt(lobby.options.starting_lives)
		: GameModes[lobby.gameMode].startingLives;

	lobby.broadcastAction({
		action: "startGame",
		deck: "c_multiplayer_1",
		seed: lobby.options.different_seeds ? undefined : generateSeed(),
	});
	// Reset players' lives
	lobby.setPlayersLives(lives);
};

const readyBlindAction = (client: Client) => {
	client.isReady = true

	const [lobby, enemy] = getEnemy(client)

	if (!client.firstReady && !enemy?.isReady && !enemy?.firstReady) {
		client.firstReady = true
		client.sendAction({ action: "speedrun" })
	}

	// TODO: Refactor for more than two players
	if (client.lobby?.host?.isReady && client.lobby.guest?.isReady) {
		// Reset ready status for next blind
		client.lobby.host.isReady = false;
		client.lobby.guest.isReady = false;

		// Reset scores for next blind
		client.lobby.host.score = 0n;
		client.lobby.guest.score = 0n;

		// Reset hands left for next blind
		client.lobby.host.handsLeft = 4;
		client.lobby.guest.handsLeft = 4;

		client.lobby.broadcastAction({ action: "startBlind" });
	}
};

const unreadyBlindAction = (client: Client) => {
	client.isReady = false;
};

const playHandAction = (
	{ handsLeft, score }: ActionHandlerArgs<ActionPlayHand>,
	client: Client,
) => {
	const [lobby, enemy] = getEnemy(client)

	if (lobby === null || enemy === null || lobby.host === null || lobby.guest === null) {
		stopGameAction(client);
		return
	}

	client.score = BigInt(String(score));

	client.handsLeft =
		typeof handsLeft === "number" ? handsLeft : Number(handsLeft);

	enemy.sendAction({
		action: "enemyInfo",
		handsLeft,
		score: client.score,
		skips: client.skips,
		lives: client.lives,
	});

	// This info is only sent on a boss blind, so it shouldn't
	// affect other blinds
	if (
		(lobby.guest.handsLeft === 0 && lobby.host.score > lobby.guest.score) ||
		(lobby.host.handsLeft === 0 && lobby.guest.score > lobby.host.score) ||
		(lobby.host.handsLeft === 0 && lobby.guest.handsLeft === 0)
	) {
		const roundWinner =
			lobby.host.score > lobby.guest.score ? lobby.host : lobby.guest;
		const roundLoser =
			roundWinner.id === lobby.host.id ? lobby.guest : lobby.host;

		if (lobby.host.score !== lobby.guest.score) {
			roundLoser.loseLife();

			// If no lives are left, we end the game
			if (lobby.host.lives === 0 || lobby.guest.lives === 0) {
				const gameWinner =
					lobby.host.lives > lobby.guest.lives ? lobby.host : lobby.guest;
				const gameLoser =
					gameWinner.id === lobby.host.id ? lobby.guest : lobby.host;

				gameWinner?.sendAction({ action: "winGame" });
				gameLoser?.sendAction({ action: "loseGame" });
				return;
			}
		}

		roundWinner.firstReady = false
		roundLoser.firstReady = false
		roundWinner.sendAction({ action: "endPvP", lost: false });
		roundLoser.sendAction({ action: "endPvP", lost: lobby.host.score !== lobby.guest.score });
	}
};

const stopGameAction = (client: Client) => {
	if (!client.lobby) {
		return;
	}
	client.lobby.broadcastAction({ action: "stopGame" });
	client.lobby.resetPlayers();
};

// Deprecated
const gameInfoAction = (client: Client) => {
	client.lobby?.sendGameInfo(client);
};

const lobbyOptionsAction = (
	options: Record<string, string>,
	client: Client,
) => {
	client.lobby?.setOptions(options);
};

const failRoundAction = (client: Client) => {
	const lobby = client.lobby;

	if (!lobby) return;

	if (lobby.options.death_on_round_loss) {
		client.loseLife()
	}

	if (client.lives === 0) {
		let gameLoser = null;
		let gameWinner = null;
		if (client.id === lobby.host?.id) {
			gameLoser = lobby.host;
			gameWinner = lobby.guest;
		} else {
			gameLoser = lobby.guest;
			gameWinner = lobby.host;
		}

		gameWinner?.sendAction({ action: "winGame" });
		gameLoser?.sendAction({ action: "loseGame" });
	}
};

const setAnteAction = (
	{ ante }: ActionHandlerArgs<ActionSetAnte>,
	client: Client,
) => {
	client.ante = ante;
};

// TODO: Fix this
const serverVersion = "0.1.8-MULTIPLAYER";
/** Verifies the client version and allows connection if it matches the server's */
const versionAction = (
	{ version }: ActionHandlerArgs<ActionVersion>,
	client: Client,
) => {
	const versionMatch = version.match(/^(\d+\.\d+\.\d+)/);
	if (versionMatch) {
		const clientVersion = versionMatch[1];
		const serverVersionNumber = serverVersion.split('-')[0];

		const [clientMajor, clientMinor, clientPatch] = clientVersion.split('.').map(Number);
		const [serverMajor, serverMinor, serverPatch] = serverVersionNumber.split('.').map(Number);

		if (clientMajor < serverMajor ||
			(clientMajor === serverMajor && clientMinor < serverMinor) ||
			(clientMajor === serverMajor && clientMinor === serverMinor && clientPatch < serverPatch)) {
			client.sendAction({
				action: "error",
				message: `[WARN] Server expecting version ${serverVersion}`
			});
		}
	}
};

const setLocationAction = ({ location }: ActionHandlerArgs<ActionSetLocation>, client: Client) => {
	client.setLocation(location);
}

const newRoundAction = (client: Client) => {
	client.resetBlocker()
}

const skipAction = ({ skips }: ActionHandlerArgs<ActionSkip>, client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	client.setSkips(skips)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "enemyInfo",
		handsLeft: client.handsLeft,
		score: client.score,
		skips: client.skips,
		lives: client.lives,
	});
}

const sendPhantomAction = ({ key }: ActionHandlerArgs<ActionSendPhantom>, client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "sendPhantom",
		key
	});
}

const removePhantomAction = ({ key }: ActionHandlerArgs<ActionRemovePhantom>, client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "removePhantom",
		key
	});
}

const asteroidAction = (client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "asteroid"
	});
}

const letsGoGamblingNemesisAction = (client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "letsGoGamblingNemesis"
	});
}

const eatPizzaAction = ({ whole }: ActionHandlerArgs<ActionEatPizza>, client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "eatPizza",
		whole
	})
}

const soldJokerAction = (client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "soldJoker"
	})
}

const spentLastShopAction = ({ amount }: ActionHandlerArgs<ActionSpentLastShop>, client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "spentLastShop",
		amount
	})
}

const magnetAction = (client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "magnet"
	})
}

const magnetResponseAction = ({ key }: ActionHandlerArgs<ActionMagnetResponse>, client: Client) => {
	const [lobby, enemy] = getEnemy(client)
	if (!lobby || !enemy) return;
	enemy.sendAction({
		action: "magnetResponse",
		key
	})
}

export const actionHandlers = {
	username: usernameAction,
	createLobby: createLobbyAction,
	joinLobby: joinLobbyAction,
	lobbyInfo: lobbyInfoAction,
	leaveLobby: leaveLobbyAction,
	keepAlive: keepAliveAction,
	startGame: startGameAction,
	readyBlind: readyBlindAction,
	unreadyBlind: unreadyBlindAction,
	playHand: playHandAction,
	stopGame: stopGameAction,
	gameInfo: gameInfoAction,
	lobbyOptions: lobbyOptionsAction,
	failRound: failRoundAction,
	setAnte: setAnteAction,
	version: versionAction,
	setLocation: setLocationAction,
	newRound: newRoundAction,
	skip: skipAction,
	sendPhantom: sendPhantomAction,
	removePhantom: removePhantomAction,
	asteroid: asteroidAction,
	letsGoGamblingNemesis: letsGoGamblingNemesisAction,
	eatPizza: eatPizzaAction,
	soldJoker: soldJokerAction,
	spentLastShop: spentLastShopAction,
	magnet: magnetAction,
	magnetResponse: magnetResponseAction,
} satisfies Partial<ActionHandlers>;
