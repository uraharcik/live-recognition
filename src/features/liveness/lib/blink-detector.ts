import type { BlinkState, LivenessConfig } from "../model/types";

export interface BlinkDetectionResult {
	newState: BlinkState;
	blinkDetected: boolean;
}

/**
 * Detect blinks using MediaPipe blendshape scores
 *
 * Note: blinkScore is from MediaPipe eyeBlink blendshapes (0-1)
 * Higher value = eyes more closed
 *
 * State transitions:
 * 1. Eyes open (score < threshold)
 * 2. Eyes close (score > threshold) - record timestamp
 * 3. Eyes open again (score < recovery threshold) - check duration
 * 4. If duration is valid (30-500ms), count as blink
 */
export function detectBlink(
	blinkScore: number,
	currentState: BlinkState,
	config: LivenessConfig
): BlinkDetectionResult {
	const { earThreshold, earRecoveryThreshold, minBlinkDuration, maxBlinkDuration } = config;
	const now = Date.now();

	// Eyes are closed (high blink score)
	if (blinkScore > earThreshold) {
		if (!currentState.isEyesClosed) {
			// Transition: open -> closed
			return {
				newState: {
					...currentState,
					isEyesClosed: true,
					closedTimestamp: now,
				},
				blinkDetected: false,
			};
		}
		// Still closed
		return { newState: currentState, blinkDetected: false };
	}

	// Eyes are open (low blink score)
	if (blinkScore < earRecoveryThreshold) {
		if (currentState.isEyesClosed && currentState.closedTimestamp !== null) {
			// Transition: closed -> open (potential blink)
			const blinkDuration = now - currentState.closedTimestamp;
			const isValidBlink =
				blinkDuration >= minBlinkDuration && blinkDuration <= maxBlinkDuration;

			return {
				newState: {
					isEyesClosed: false,
					closedTimestamp: null,
					blinkCount: currentState.blinkCount + (isValidBlink ? 1 : 0),
				},
				blinkDetected: isValidBlink,
			};
		}
		// Still open
		return {
			newState: {
				...currentState,
				isEyesClosed: false,
				closedTimestamp: null,
			},
			blinkDetected: false,
		};
	}

	// In hysteresis zone (between thresholds)
	return { newState: currentState, blinkDetected: false };
}

export function createInitialBlinkState(): BlinkState {
	return {
		isEyesClosed: false,
		closedTimestamp: null,
		blinkCount: 0,
	};
}
