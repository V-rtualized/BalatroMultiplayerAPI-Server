// Server to Client
export type ActionConnected = { action: 'connected' }
export type ActionError = { action: 'error'; message: string }
export type ActionJoinedLobby = { action: 'joinedLobby'; code: string; type: GameMode }
export type ActionLobbyInfo = {
	action: 'lobbyInfo'
	host: string
	hostHash: string
	guest?: string
	guestHash?: string
	isHost: boolean
}
export type ActionStopGame = { action: 'stopGame' }
export type ActionStartGame = {
	action: 'startGame'
	deck: string
	stake?: number
	seed?: string
}
export type ActionStartBlind = { action: 'startBlind' }
export type ActionWinGame = { action: 'winGame' }
export type ActionLoseGame = { action: 'loseGame' }
export type ActionGameInfo = {
	action: 'gameInfo'
	small?: string
	big?: string
	boss?: string
}
export type ActionPlayerInfo = { action: 'playerInfo'; lives: number }
export type ActionEnemyInfo = {
	action: 'enemyInfo'
	score: BigInt
	handsLeft: number
	skips: number
	lives: number
}
export type ActionEndPvP = { action: 'endPvP'; lost: boolean }
export type ActionLobbyOptions = { action: 'lobbyOptions', gamemode: string }
export type ActionRequestVersion = { action: 'version' }
export type ActionEnemyLocation = { action: 'enemyLocation'; location: string }
export type ActionSendPhantom = { action: 'sendPhantom', key: string }
export type ActionRemovePhantom = { action: 'removePhantom', key: string }
export type ActionSpeedrun = { action: 'speedrun' }
export type ActionAsteroid = { action: 'asteroid' }
export type ActionLetsGoGamblingNemesis = { action: 'letsGoGamblingNemesis' }
export type ActionEatPizza = { action: 'eatPizza', whole: boolean }
export type ActionSoldJoker = { action: 'soldJoker' }
export type ActionSpentLastShop = { action: 'spentLastShop', amount: number }
export type ActionMagnet = { action: 'magnet' }
export type ActionMagnetResponse = { action: 'magnetResponse', key: string }
export type ActionServerToClient =
	| ActionConnected
	| ActionError
	| ActionJoinedLobby
	| ActionLobbyInfo
	| ActionStopGame
	| ActionStartGame
	| ActionStartBlind
	| ActionWinGame
	| ActionLoseGame
	| ActionGameInfo
	| ActionPlayerInfo
	| ActionEnemyInfo
	| ActionEndPvP
	| ActionLobbyOptions
	| ActionRequestVersion
	| ActionUtility
	| ActionEnemyLocation
	| ActionSendPhantom
	| ActionRemovePhantom
	| ActionSpeedrun
	| ActionAsteroid
	| ActionLetsGoGamblingNemesis
	| ActionEatPizza
	| ActionSoldJoker
	| ActionSpentLastShop
	| ActionMagnet
	| ActionMagnetResponse
// Client to Server
export type ActionUsername = { action: 'username'; username: string; modHash: string }
export type ActionCreateLobby = { action: 'createLobby'; gameMode: GameMode }
export type ActionJoinLobby = { action: 'joinLobby'; code: string }
export type ActionLeaveLobby = { action: 'leaveLobby' }
export type ActionLobbyInfoRequest = { action: 'lobbyInfo' }
export type ActionStopGameRequest = { action: 'stopGame' }
export type ActionStartGameRequest = { action: 'startGame' }
export type ActionReadyBlind = { action: 'readyBlind' }
export type ActionUnreadyBlind = { action: 'unreadyBlind' }
export type ActionPlayHand = {
	action: 'playHand'
	score: BigInt
	handsLeft: number
	hasSpeedrun: boolean
}
export type ActionGameInfoRequest = { action: 'gameInfo' }
export type ActionPlayerInfoRequest = { action: 'playerInfo' }
export type ActionEnemyInfoRequest = { action: 'enemyInfo' }
export type ActionFailRound = { action: 'failRound' }
export type ActionSetAnte = {
	action: 'setAnte'
	ante: number
}
export type ActionVersion = { action: 'version'; version: string }
export type ActionSetLocation = { action: 'setLocation'; location: string }
export type ActionNewRound = { action: 'newRound' }
export type ActionSkip = { action: 'skip', skips: number }
export type ActionLetsGoGamblingNemesisRequest = { action: 'letsGoGamblingNemesis' }
export type ActionEatPizzaRequest = { action: 'eatPizza', whole: boolean }
export type ActionSoldJokerRequest = { action: 'soldJoker' }
export type ActionSpentLastShopRequest = { action: 'spentLastShop', amount: number }
export type ActionMagnetRequest = { action: 'magnet' }
export type ActionMagnetResponseRequest = { action: 'magnetResponse', key: string }
export type ActionClientToServer =
	| ActionUsername
	| ActionCreateLobby
	| ActionJoinLobby
	| ActionLeaveLobby
	| ActionLobbyInfoRequest
	| ActionStopGameRequest
	| ActionStartGameRequest
	| ActionReadyBlind
	| ActionPlayHand
	| ActionGameInfoRequest
	| ActionPlayerInfoRequest
	| ActionEnemyInfoRequest
	| ActionUnreadyBlind
	| ActionLobbyOptions
	| ActionFailRound
	| ActionSetAnte
	| ActionVersion
	| ActionSetLocation
	| ActionNewRound
	| ActionSkip
	| ActionSendPhantom
	| ActionRemovePhantom
	| ActionAsteroid
	| ActionLetsGoGamblingNemesisRequest
	| ActionEatPizzaRequest
	| ActionSoldJokerRequest
	| ActionSpentLastShopRequest
	| ActionMagnetRequest
	| ActionMagnetResponseRequest
// Utility actions
export type ActionKeepAlive = { action: 'keepAlive' }
export type ActionKeepAliveAck = { action: 'keepAliveAck' }

export type ActionUtility = ActionKeepAlive | ActionKeepAliveAck

export type Action = ActionServerToClient | ActionClientToServer | ActionUtility

type HandledActions = ActionClientToServer | ActionUtility
export type ActionHandlers = {
	[K in HandledActions['action']]: keyof ActionHandlerArgs<
		Extract<HandledActions, { action: K }>
	> extends never
	? (
		// biome-ignore lint/suspicious/noExplicitAny: Function can receive any arguments
		...args: any[]
	) => void
	: (
		action: ActionHandlerArgs<Extract<HandledActions, { action: K }>>,
		// biome-ignore lint/suspicious/noExplicitAny: Function can receive any arguments
		...args: any[]
	) => void
}

export type ActionHandlerArgs<T extends HandledActions> = Omit<T, 'action'>

// Other types
export type GameMode = 'attrition' | 'showdown'
