import type { LivenessConfig } from "../model/types";

export const DEFAULT_LIVENESS_CONFIG = {
	earThreshold: 0.5, // Blink threshold (0-1, higher = more closed)
	earRecoveryThreshold: 0.3, // Eyes open threshold
	minBlinkDuration: 30, // Min blink ms
	maxBlinkDuration: 500, // Max blink ms
	requiredBlinks: 1, // Blinks needed
	timeoutDuration: 10000, // 10 second timeout
	detectionInterval: 50, // Detection loop interval ms
} satisfies LivenessConfig;

// Use Vite's base URL to construct the correct models path
export const MODELS_PATH = `${import.meta.env.BASE_URL}models`;

export const STATUS_MESSAGES: Record<string, string> = {
	idle: "Preparing camera...",
	loading: "Loading face detection...",
	positioning: "Position your face in the frame",
	detecting: "Blink to verify you're real",
	success: "Verification successful!",
	timeout: "Verification timed out. Please try again.",
	error: "An error occurred. Please try again.",
};

// MediaPipe blendshape indices for eye blinks
export const BLINK_LEFT_INDEX = 9; // eyeBlinkLeft
export const BLINK_RIGHT_INDEX = 10; // eyeBlinkRight
