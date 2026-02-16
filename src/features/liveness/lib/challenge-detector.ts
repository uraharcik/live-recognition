import type { Challenge, ChallengeType } from "../model/types";

interface BlendshapeScores {
	eyeBlinkLeft: number;
	eyeBlinkRight: number;
	mouthSmileLeft: number;
	mouthSmileRight: number;
	jawOpen: number;
	browInnerUp: number;
	browOuterUpLeft: number;
	browOuterUpRight: number;
	eyeSquintLeft: number;
	eyeSquintRight: number;
	eyeLookUpLeft: number;
	eyeLookUpRight: number;
	eyeLookDownLeft: number;
	eyeLookDownRight: number;
	mouthPucker: number;
	mouthFrownLeft: number;
	mouthFrownRight: number;
	browDownLeft: number;
	browDownRight: number;
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
	raiseEyebrows: { instruction: "Raise your eyebrows" },
	squint: { instruction: "Squint your eyes" },
	lookUp: { instruction: "Look up" },
	lookDown: { instruction: "Look down" },
	winkLeft: { instruction: "Wink your left eye" },
	winkRight: { instruction: "Wink your right eye" },
	purseLips: { instruction: "Purse your lips" },
	frown: { instruction: "Frown" },
};

const THRESHOLDS = {
	blink: 0.5,
	smile: 0.4,
	jawOpen: 0.3,
	headTurn: 0.15,
	browRaise: 0.35,
	squint: 0.4,
	eyeLook: 0.4,
	wink: 0.4,
	winkOpenEye: 0.35,
	winkHoldMs: 200,
	purseLips: 0.4,
	frown: 0.3,
};

/**
 * Generate a random sequence of challenges
 */
export function generateChallenges(count: number): Challenge[] {
	const allTypes: ChallengeType[] = [
		"blink", "turnLeft", "turnRight", "smile", "openMouth",
		"raiseEyebrows", "squint", "lookUp",
		"lookDown", "winkLeft", "winkRight", "purseLips", "frown",
	];
	const challenges: Challenge[] = [];
	const usedTypes = new Set<ChallengeType>();

	while (challenges.length < count && usedTypes.size < allTypes.length) {
		const randomIndex = Math.floor(Math.random() * allTypes.length);
		const type = allTypes[randomIndex];

		if (!usedTypes.has(type)) {
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
 */
export function extractHeadPose(landmarks: Array<{ x: number; y: number; z: number }>): HeadPose {
	const noseTip = landmarks[1];
	const leftEye = landmarks[33];
	const rightEye = landmarks[263];

	const faceCenterX = (leftEye.x + rightEye.x) / 2;

	const yaw = (faceCenterX - noseTip.x) * 3;
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
				if (!newState.eyesClosed) {
					newState.eyesClosed = true;
					newState.eyesClosedTime = Date.now();
				}
			} else if (newState.eyesClosed && avgBlink < 0.3) {
				const blinkDuration = Date.now() - (newState.eyesClosedTime ?? 0);
				if (blinkDuration > 50 && blinkDuration < 500) {
					return { completed: true, newState: { ...newState, eyesClosed: false } };
				}
				newState.eyesClosed = false;
			}
			return { completed: false, newState };
		}

		case "turnLeft": {
			if (headPose.yaw < -THRESHOLDS.headTurn) {
				if (!newState.turnedLeft) {
					newState.turnedLeft = true;
				}
			} else if (newState.turnedLeft && headPose.yaw > -0.05) {
				return { completed: true, newState: { ...newState, turnedLeft: false } };
			}
			return { completed: false, newState };
		}

		case "turnRight": {
			if (headPose.yaw > THRESHOLDS.headTurn) {
				if (!newState.turnedRight) {
					newState.turnedRight = true;
				}
			} else if (newState.turnedRight && headPose.yaw < 0.05) {
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

		case "raiseEyebrows": {
			const avgBrow = (blendshapes.browOuterUpLeft + blendshapes.browOuterUpRight + blendshapes.browInnerUp) / 3;
			if (avgBrow > THRESHOLDS.browRaise) {
				return { completed: true, newState };
			}
			return { completed: false, newState };
		}

		case "squint": {
			const avgSquint = (blendshapes.eyeSquintLeft + blendshapes.eyeSquintRight) / 2;
			const avgBlink = (blendshapes.eyeBlinkLeft + blendshapes.eyeBlinkRight) / 2;
			// Squint without fully closing eyes
			if (avgSquint > THRESHOLDS.squint && avgBlink < THRESHOLDS.blink) {
				return { completed: true, newState };
			}
			return { completed: false, newState };
		}

		case "lookUp": {
			const avgLookUp = (blendshapes.eyeLookUpLeft + blendshapes.eyeLookUpRight) / 2;
			if (avgLookUp > THRESHOLDS.eyeLook) {
				return { completed: true, newState };
			}
			return { completed: false, newState };
		}

		case "lookDown": {
			const avgLookDown = (blendshapes.eyeLookDownLeft + blendshapes.eyeLookDownRight) / 2;
			if (avgLookDown > THRESHOLDS.eyeLook) {
				return { completed: true, newState };
			}
			return { completed: false, newState };
		}

		case "winkLeft": {
			const leftClosed = blendshapes.eyeBlinkLeft > THRESHOLDS.wink;
			const rightOpen = blendshapes.eyeBlinkRight < THRESHOLDS.winkOpenEye;
			// Reject if both eyes are closing (natural blink)
			const bothClosing = blendshapes.eyeBlinkLeft > THRESHOLDS.wink && blendshapes.eyeBlinkRight > THRESHOLDS.winkOpenEye;

			if (leftClosed && rightOpen && !bothClosing) {
				if (newState.winkingSide !== "left") {
					newState.winkingSide = "left";
					newState.winkStartTime = Date.now();
				} else {
					const held = Date.now() - (newState.winkStartTime ?? 0);
					if (held >= THRESHOLDS.winkHoldMs) {
						newState.winkingSide = null;
						newState.winkStartTime = null;
						return { completed: true, newState };
					}
				}
			} else {
				newState.winkingSide = null;
				newState.winkStartTime = null;
			}
			return { completed: false, newState };
		}

		case "winkRight": {
			const rightClosed = blendshapes.eyeBlinkRight > THRESHOLDS.wink;
			const leftOpen = blendshapes.eyeBlinkLeft < THRESHOLDS.winkOpenEye;
			// Reject if both eyes are closing (natural blink)
			const bothClosing = blendshapes.eyeBlinkRight > THRESHOLDS.wink && blendshapes.eyeBlinkLeft > THRESHOLDS.winkOpenEye;

			if (rightClosed && leftOpen && !bothClosing) {
				if (newState.winkingSide !== "right") {
					newState.winkingSide = "right";
					newState.winkStartTime = Date.now();
				} else {
					const held = Date.now() - (newState.winkStartTime ?? 0);
					if (held >= THRESHOLDS.winkHoldMs) {
						newState.winkingSide = null;
						newState.winkStartTime = null;
						return { completed: true, newState };
					}
				}
			} else {
				newState.winkingSide = null;
				newState.winkStartTime = null;
			}
			return { completed: false, newState };
		}

		case "purseLips": {
			if (blendshapes.mouthPucker > THRESHOLDS.purseLips) {
				return { completed: true, newState };
			}
			return { completed: false, newState };
		}

		case "frown": {
			const avgFrown = (blendshapes.mouthFrownLeft + blendshapes.mouthFrownRight) / 2;
			const avgBrowDown = (blendshapes.browDownLeft + blendshapes.browDownRight) / 2;
			// Either mouth frown or brow frown
			if (avgFrown > THRESHOLDS.frown || avgBrowDown > THRESHOLDS.frown) {
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
	winkingSide: "left" | "right" | null;
	winkStartTime: number | null;
}

export function createInitialChallengeState(): ChallengeState {
	return {
		eyesClosed: false,
		eyesClosedTime: null,
		turnedLeft: false,
		turnedRight: false,
		winkingSide: null,
		winkStartTime: null,
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
		browInnerUp: findScore("browInnerUp"),
		browOuterUpLeft: findScore("browOuterUpLeft"),
		browOuterUpRight: findScore("browOuterUpRight"),
		eyeSquintLeft: findScore("eyeSquintLeft"),
		eyeSquintRight: findScore("eyeSquintRight"),
		eyeLookUpLeft: findScore("eyeLookUpLeft"),
		eyeLookUpRight: findScore("eyeLookUpRight"),
		eyeLookDownLeft: findScore("eyeLookDownLeft"),
		eyeLookDownRight: findScore("eyeLookDownRight"),
		mouthPucker: findScore("mouthPucker"),
		mouthFrownLeft: findScore("mouthFrownLeft"),
		mouthFrownRight: findScore("mouthFrownRight"),
		browDownLeft: findScore("browDownLeft"),
		browDownRight: findScore("browDownRight"),
	};
}