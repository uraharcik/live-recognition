import type { LivenessConfig } from "../model/types";

export const DEFAULT_LIVENESS_CONFIG = {
	earThreshold: 0.5, // Blink threshold (0-1, higher = more closed)
	earRecoveryThreshold: 0.3, // Eyes open threshold
	minBlinkDuration: 30, // Min blink ms
	maxBlinkDuration: 500, // Max blink ms
	requiredBlinks: 1, // Blinks needed (legacy, not used with challenges)
	timeoutDuration: 30000, // 30 second timeout for all challenges
	detectionInterval: 50, // Detection loop interval ms
	challengeCount: 2, // Number of random challenges to complete
} satisfies LivenessConfig;

export const STATUS_MESSAGES: Record<string, string> = {
	idle: "Preparing camera...",
	loading: "Loading face detection...",
	positioning: "Position your face in the frame",
	challenge: "", // Dynamic based on current challenge
	success: "Look at the camera and smile!",
	timeout: "Verification timed out. Please try again.",
	error: "An error occurred. Please try again.",
};
