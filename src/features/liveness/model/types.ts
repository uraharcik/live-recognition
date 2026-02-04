export type LivenessStatus =
	| "idle"
	| "loading"
	| "positioning"
	| "detecting"
	| "success"
	| "timeout"
	| "error";

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
}

export interface LivenessState {
	status: LivenessStatus;
	blinkCount: number;
	errorMessage: string | null;
}
