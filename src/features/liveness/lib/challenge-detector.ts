import type { Challenge, ChallengeType } from "../model/types";

export interface BlendshapeScores {
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
	mouthPucker: number;
}

export interface HeadPose {
	yaw: number; // Left/right rotation (-1 to 1)
	pitch: number; // Up/down rotation (-1 to 1)
}

export const CHALLENGE_DEFINITIONS: Record<ChallengeType, { instruction: string }> = {
	blink: { instruction: "Blink your eyes" },
	turnLeft: { instruction: "Turn your head left" },
	turnRight: { instruction: "Turn your head right" },
	smile: { instruction: "Smile" },
	openMouth: { instruction: "Open your mouth" },
	raiseEyebrows: { instruction: "Raise your eyebrows" },
	squint: { instruction: "Squint your eyes" },
	lookUp: { instruction: "Tilt your head up" },
	lookDown: { instruction: "Tilt your head down" },
	winkLeft: { instruction: "Wink your left eye" },
	winkRight: { instruction: "Wink your right eye" },
	purseLips: { instruction: "Purse your lips" },
};

export const THRESHOLDS = {
	blink: 0.45,
	smile: 0.35,
	jawOpen: 0.25,
	headTurn: 0.15,
	browRaise: 0.3,
	squint: 0.3,
	squintMaxBlink: 0.35,
	headTilt: 0.15,
	wink: 0.35,
	winkOpenEye: 0.5,
	winkAsymmetry: 0.15,
	winkHoldMs: 150,
	purseLips: 0.35,
	holdMs: 150,
};

/**
 * Generate a random sequence of challenges
 */
export function generateChallenges(count: number): Challenge[] {
	const allTypes: ChallengeType[] = [
		"blink",
		"turnLeft",
		"turnRight",
		"smile",
		"openMouth",
		"raiseEyebrows",
		"squint",
		"lookUp",
		"lookDown",
		"winkLeft",
		"winkRight",
		"purseLips",
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
export function extractHeadPose(
	landmarks: Array<{ x: number; y: number; z: number }>,
): HeadPose {
	const noseTip = landmarks[1];
	const leftEye = landmarks[33];
	const rightEye = landmarks[263];
	const forehead = landmarks[10];
	const chin = landmarks[152];

	const faceCenterX = (leftEye.x + rightEye.x) / 2;
	// Negated so positive yaw = user's right turn (camera frame is unmirrored)
	const yaw = (faceCenterX - noseTip.x) * 3;

	// Pitch from z-depth difference between forehead and chin
	// Tilt up → forehead moves back (z+), chin forward (z-) → negative pitch
	// Tilt down → forehead forward (z-), chin back (z+) → positive pitch
	const pitch = (chin.z - forehead.z) * 8;

	return {
		yaw: Math.max(-1, Math.min(1, yaw)),
		pitch: Math.max(-1, Math.min(1, pitch)),
	};
}

function checkWithHold(
	conditionMet: boolean,
	state: ChallengeState,
): { completed: boolean; newState: ChallengeState } {
	const newState = { ...state };
	if (conditionMet) {
		if (newState.holdStartTime === null) {
			newState.holdStartTime = Date.now();
		} else if (Date.now() - newState.holdStartTime >= THRESHOLDS.holdMs) {
			newState.holdStartTime = null;
			return { completed: true, newState };
		}
	} else {
		newState.holdStartTime = null;
	}
	return { completed: false, newState };
}

/**
 * Check if a specific challenge is completed based on current face data
 */
export function checkChallengeCompletion(
	challenge: ChallengeType,
	blendshapes: BlendshapeScores,
	headPose: HeadPose,
	previousState: ChallengeState,
): { completed: boolean; newState: ChallengeState } {
	const newState = { ...previousState };

	switch (challenge) {
		case "blink": {
			const avgBlink =
				(blendshapes.eyeBlinkLeft + blendshapes.eyeBlinkRight) / 2;

			if (avgBlink > THRESHOLDS.blink) {
				if (!newState.eyesClosed) {
					newState.eyesClosed = true;
					newState.eyesClosedTime = Date.now();
				}
			} else if (newState.eyesClosed && avgBlink < 0.25) {
				const blinkDuration = Date.now() - (newState.eyesClosedTime ?? 0);
				if (blinkDuration > 50 && blinkDuration < 600) {
					return {
						completed: true,
						newState: { ...newState, eyesClosed: false },
					};
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
				return {
					completed: true,
					newState: { ...newState, turnedLeft: false },
				};
			}
			return { completed: false, newState };
		}

		case "turnRight": {
			if (headPose.yaw > THRESHOLDS.headTurn) {
				if (!newState.turnedRight) {
					newState.turnedRight = true;
				}
			} else if (newState.turnedRight && headPose.yaw < 0.05) {
				return {
					completed: true,
					newState: { ...newState, turnedRight: false },
				};
			}
			return { completed: false, newState };
		}

		case "smile": {
			const avgSmile =
				(blendshapes.mouthSmileLeft + blendshapes.mouthSmileRight) / 2;
			return checkWithHold(avgSmile > THRESHOLDS.smile, newState);
		}

		case "openMouth": {
			return checkWithHold(blendshapes.jawOpen > THRESHOLDS.jawOpen, newState);
		}

		case "raiseEyebrows": {
			const avgBrow =
				(blendshapes.browOuterUpLeft +
					blendshapes.browOuterUpRight +
					blendshapes.browInnerUp) /
				3;
			return checkWithHold(avgBrow > THRESHOLDS.browRaise, newState);
		}

		case "squint": {
			const avgSquint =
				(blendshapes.eyeSquintLeft + blendshapes.eyeSquintRight) / 2;
			const avgBlink =
				(blendshapes.eyeBlinkLeft + blendshapes.eyeBlinkRight) / 2;
			return checkWithHold(
				avgSquint > THRESHOLDS.squint && avgBlink < THRESHOLDS.squintMaxBlink,
				newState,
			);
		}

		case "lookUp": {
			if (headPose.pitch < -THRESHOLDS.headTilt) {
				if (!newState.tiltedUp) {
					newState.tiltedUp = true;
				}
			} else if (newState.tiltedUp && headPose.pitch > -0.05) {
				return {
					completed: true,
					newState: { ...newState, tiltedUp: false },
				};
			}
			return { completed: false, newState };
		}

		case "lookDown": {
			if (headPose.pitch > THRESHOLDS.headTilt) {
				if (!newState.tiltedDown) {
					newState.tiltedDown = true;
				}
			} else if (newState.tiltedDown && headPose.pitch < 0.05) {
				return {
					completed: true,
					newState: { ...newState, tiltedDown: false },
				};
			}
			return { completed: false, newState };
		}

		case "winkLeft": {
			const leftClosed = blendshapes.eyeBlinkLeft > THRESHOLDS.wink;
			const rightOpen = blendshapes.eyeBlinkRight < THRESHOLDS.winkOpenEye;
			const asymmetry = blendshapes.eyeBlinkLeft - blendshapes.eyeBlinkRight;

			if (leftClosed && rightOpen && asymmetry > THRESHOLDS.winkAsymmetry) {
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
			const asymmetry = blendshapes.eyeBlinkRight - blendshapes.eyeBlinkLeft;

			if (rightClosed && leftOpen && asymmetry > THRESHOLDS.winkAsymmetry) {
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
			return checkWithHold(
				blendshapes.mouthPucker > THRESHOLDS.purseLips,
				newState,
			);
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
	tiltedUp: boolean;
	tiltedDown: boolean;
	winkingSide: "left" | "right" | null;
	winkStartTime: number | null;
	holdStartTime: number | null;
}

export function createInitialChallengeState(): ChallengeState {
	return {
		eyesClosed: false,
		eyesClosedTime: null,
		turnedLeft: false,
		turnedRight: false,
		tiltedUp: false,
		tiltedDown: false,
		winkingSide: null,
		winkStartTime: null,
		holdStartTime: null,
	};
}

/**
 * Extract blendshape scores from MediaPipe result
 */
export function extractBlendshapeScores(
	categories: Array<{ categoryName: string; score: number }>,
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
		mouthPucker: findScore("mouthPucker"),
	};
}
