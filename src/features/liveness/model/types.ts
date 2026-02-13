export type LivenessStatus =
	| "idle"
	| "loading"
	| "positioning"
	| "challenge"
	| "success"
	| "timeout"
	| "error";

export type ChallengeType =
	| "blink"
	| "turnLeft"
	| "turnRight"
	| "smile"
	| "openMouth"
	| "raiseEyebrows"
	| "squint"
	| "puffCheeks"
	| "lookUp"
	| "lookDown"
	| "winkLeft"
	| "winkRight"
	| "purseLips"
	| "frown";

export interface Challenge {
	type: ChallengeType;
	instruction: string;
	completed: boolean;
}

export interface BlinkState {
	isEyesClosed: boolean;
	closedTimestamp: number | null;
	blinkCount: number;
}

export interface EarResult {
	leftEar: number;
	rightEar: number;
	averageEar: number;
}

export interface LivenessConfig {
	earThreshold: number;
	earRecoveryThreshold: number;
	minBlinkDuration: number;
	maxBlinkDuration: number;
	requiredBlinks: number;
	timeoutDuration: number;
	detectionInterval: number;
	challengeCount: number;
}

export interface LivenessState {
	status: LivenessStatus;
	blinkCount: number;
	errorMessage: string | null;
	currentChallenge: Challenge | null;
	completedChallenges: number;
	totalChallenges: number;
}
