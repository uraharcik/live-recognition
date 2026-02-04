import type { Challenge, ChallengeType } from "../model/types";

interface BlendshapeScores {
	eyeBlinkLeft: number;
	eyeBlinkRight: number;
	mouthSmileLeft: number;
	mouthSmileRight: number;
	jawOpen: number;
}

interface HeadPose {
	yaw: number; // Left/right rotation (-1 to 1)
	pitch: number; // Up/down rotation (-1 to 1)
}

const CHALLENGE_DEFINITIONS: Record<ChallengeType, { instruction: string }> = {
	blink: { instruction: "Blink your eyes" },
	turnLeft: { instruction: "Turn your head left" },
	turnRight: { instruction: "Turn your head right" },
	smile: { instruction: "Smile" },
	openMouth: { instruction: "Open your mouth" },
};

// Thresholds for challenge detection
const THRESHOLDS = {
	blink: 0.5, // Eye blink score threshold
	smile: 0.4, // Smile score threshold
	jawOpen: 0.3, // Jaw open threshold
	headTurn: 0.15, // Head rotation threshold (yaw)
};

/**
 * Generate a random sequence of challenges
 */
export function generateChallenges(count: number): Challenge[] {
	const allTypes: ChallengeType[] = ["blink", "turnLeft", "turnRight", "smile", "openMouth"];
	const challenges: Challenge[] = [];
	const usedTypes = new Set<ChallengeType>();

	while (challenges.length < count && usedTypes.size < allTypes.length) {
		const randomIndex = Math.floor(Math.random() * allTypes.length);
		const type = allTypes[randomIndex];

		// Avoid repeating the same challenge consecutively
		if (!usedTypes.has(type) || challenges.length >= allTypes.length) {
			challenges.push({
				type,
				instruction: CHALLENGE_DEFINITIONS[type].instruction,
				completed: false,
			});
			usedTypes.add(type);
		}
	}

	return challenges;
}

/**
 * Extract head pose from face landmarks
 * Uses nose tip and face edges to estimate yaw (left/right rotation)
 */
export function extractHeadPose(landmarks: Array<{ x: number; y: number; z: number }>): HeadPose {
	// Key landmarks for head pose estimation:
	// 1 - nose tip
	// 33 - left eye outer corner
	// 263 - right eye outer corner
	// 168 - nose bridge (between eyes)

	const noseTip = landmarks[1];
	const leftEye = landmarks[33];
	const rightEye = landmarks[263];

	// Calculate face center
	const faceCenterX = (leftEye.x + rightEye.x) / 2;

	// Yaw: nose tip position relative to face center
	// If nose is left of center, head is turned right (positive yaw)
	// If nose is right of center, head is turned left (negative yaw)
	const yaw = (faceCenterX - noseTip.x) * 3; // Amplify for sensitivity

	// Pitch can be estimated from nose tip z or y position relative to eyes
	const pitch = (noseTip.y - (leftEye.y + rightEye.y) / 2) * 2;

	return {
		yaw: Math.max(-1, Math.min(1, yaw)),
		pitch: Math.max(-1, Math.min(1, pitch)),
	};
}

/**
 * Check if a specific challenge is completed based on current face data
 */
export function checkChallengeCompletion(
	challenge: ChallengeType,
	blendshapes: BlendshapeScores,
	headPose: HeadPose,
	previousState: ChallengeState
): { completed: boolean; newState: ChallengeState } {
	const newState = { ...previousState };

	switch (challenge) {
		case "blink": {
			const avgBlink = (blendshapes.eyeBlinkLeft + blendshapes.eyeBlinkRight) / 2;

			if (avgBlink > THRESHOLDS.blink) {
				// Eyes closed
				if (!newState.eyesClosed) {
					newState.eyesClosed = true;
					newState.eyesClosedTime = Date.now();
				}
			} else if (newState.eyesClosed && avgBlink < 0.3) {
				// Eyes opened after being closed - blink detected
				const blinkDuration = Date.now() - (newState.eyesClosedTime ?? 0);
				if (blinkDuration > 50 && blinkDuration < 500) {
					return { completed: true, newState: { ...newState, eyesClosed: false } };
				}
				newState.eyesClosed = false;
			}
			return { completed: false, newState };
		}

		case "turnLeft": {
			// Head turned left = negative yaw
			if (headPose.yaw < -THRESHOLDS.headTurn) {
				if (!newState.turnedLeft) {
					newState.turnedLeft = true;
				}
			} else if (newState.turnedLeft && headPose.yaw > -0.05) {
				// Returned to center after turning left
				return { completed: true, newState: { ...newState, turnedLeft: false } };
			}
			return { completed: false, newState };
		}

		case "turnRight": {
			// Head turned right = positive yaw
			if (headPose.yaw > THRESHOLDS.headTurn) {
				if (!newState.turnedRight) {
					newState.turnedRight = true;
				}
			} else if (newState.turnedRight && headPose.yaw < 0.05) {
				// Returned to center after turning right
				return { completed: true, newState: { ...newState, turnedRight: false } };
			}
			return { completed: false, newState };
		}

		case "smile": {
			const avgSmile = (blendshapes.mouthSmileLeft + blendshapes.mouthSmileRight) / 2;
			if (avgSmile > THRESHOLDS.smile) {
				return { completed: true, newState };
			}
			return { completed: false, newState };
		}

		case "openMouth": {
			if (blendshapes.jawOpen > THRESHOLDS.jawOpen) {
				return { completed: true, newState };
			}
			return { completed: false, newState };
		}

		default:
			return { completed: false, newState };
	}
}

export interface ChallengeState {
	eyesClosed: boolean;
	eyesClosedTime: number | null;
	turnedLeft: boolean;
	turnedRight: boolean;
}

export function createInitialChallengeState(): ChallengeState {
	return {
		eyesClosed: false,
		eyesClosedTime: null,
		turnedLeft: false,
		turnedRight: false,
	};
}

/**
 * Extract blendshape scores from MediaPipe result
 */
export function extractBlendshapeScores(
	categories: Array<{ categoryName: string; score: number }>
): BlendshapeScores {
	const findScore = (name: string) =>
		categories.find((c) => c.categoryName === name)?.score ?? 0;

	return {
		eyeBlinkLeft: findScore("eyeBlinkLeft"),
		eyeBlinkRight: findScore("eyeBlinkRight"),
		mouthSmileLeft: findScore("mouthSmileLeft"),
		mouthSmileRight: findScore("mouthSmileRight"),
		jawOpen: findScore("jawOpen"),
	};
}
