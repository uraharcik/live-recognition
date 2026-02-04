import { useCallback, useEffect, useRef, useState } from "react";
import {
	checkChallengeCompletion,
	createInitialChallengeState,
	extractBlendshapeScores,
	extractHeadPose,
	generateChallenges,
	type ChallengeState,
} from "../lib/challenge-detector";
import { DEFAULT_LIVENESS_CONFIG } from "../lib/constants";
import { loadFaceLandmarker } from "./face-api-loader";
import type { Challenge, LivenessConfig, LivenessState } from "./types";

interface UseLivenessStateOptions {
	videoRef: React.RefObject<HTMLVideoElement | null>;
	onSuccess: (capturedImage: string) => void;
	config?: Partial<LivenessConfig>;
}

export function useLivenessState({
	videoRef,
	onSuccess,
	config: configOverrides,
}: UseLivenessStateOptions) {
	const config = { ...DEFAULT_LIVENESS_CONFIG, ...configOverrides };

	const [state, setState] = useState<LivenessState>({
		status: "idle",
		blinkCount: 0,
		errorMessage: null,
		currentChallenge: null,
		completedChallenges: 0,
		totalChallenges: config.challengeCount,
	});

	const challengesRef = useRef<Challenge[]>([]);
	const currentChallengeIndexRef = useRef(0);
	const challengeStateRef = useRef<ChallengeState>(createInitialChallengeState());
	const detectionIntervalRef = useRef<number | null>(null);
	const timeoutRef = useRef<number | null>(null);
	const isDetectingRef = useRef(false);
	const lastTimestampRef = useRef<number>(0);

	const captureImage = useCallback(() => {
		const video = videoRef.current;
		if (!video) return null;

		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");

		if (!ctx) return null;

		ctx.drawImage(video, 0, 0);
		return canvas.toDataURL("image/jpeg");
	}, [videoRef]);

	const stopDetection = useCallback(() => {
		if (detectionIntervalRef.current) {
			clearInterval(detectionIntervalRef.current);
			detectionIntervalRef.current = null;
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		isDetectingRef.current = false;
	}, []);

	const advanceToNextChallenge = useCallback(() => {
		currentChallengeIndexRef.current += 1;
		challengeStateRef.current = createInitialChallengeState();

		if (currentChallengeIndexRef.current >= challengesRef.current.length) {
			// All challenges completed!
			stopDetection();
			setState((prev) => ({
				...prev,
				status: "success",
				currentChallenge: null,
				completedChallenges: challengesRef.current.length,
			}));

			// Wait for user to return to neutral expression before capturing
			setTimeout(() => {
				const image = captureImage();
				if (image) {
					onSuccess(image);
				}
			}, 1000);
		} else {
			// Move to next challenge
			const nextChallenge = challengesRef.current[currentChallengeIndexRef.current];
			setState((prev) => ({
				...prev,
				currentChallenge: nextChallenge,
				completedChallenges: currentChallengeIndexRef.current,
			}));
		}
	}, [stopDetection, captureImage, onSuccess]);

	const runDetectionLoop = useCallback(async () => {
		const video = videoRef.current;
		if (!video || !isDetectingRef.current) return;

		const faceLandmarker = await loadFaceLandmarker();
		if (!faceLandmarker) return;

		try {
			const timestamp = performance.now();
			if (timestamp <= lastTimestampRef.current) {
				return;
			}
			lastTimestampRef.current = timestamp;

			const result = faceLandmarker.detectForVideo(video, timestamp);

			if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
				setState((prev) => ({
					...prev,
					status: "positioning",
				}));
				return;
			}

			// Face detected
			const currentChallenge = challengesRef.current[currentChallengeIndexRef.current];

			if (!currentChallenge) {
				return;
			}

			// Update status to challenge if we were positioning
			setState((prev) => {
				if (prev.status === "positioning") {
					return { ...prev, status: "challenge", currentChallenge };
				}
				return prev;
			});

			// Get blendshapes and head pose
			const blendshapes = result.faceBlendshapes?.[0]?.categories;
			if (!blendshapes) {
				return;
			}

			const scores = extractBlendshapeScores(blendshapes);
			const landmarks = result.faceLandmarks[0];
			const headPose = extractHeadPose(landmarks);

			// Debug logging
			console.log(
				`Challenge: ${currentChallenge.type}`,
				`| Blink: ${((scores.eyeBlinkLeft + scores.eyeBlinkRight) / 2).toFixed(2)}`,
				`| Smile: ${((scores.mouthSmileLeft + scores.mouthSmileRight) / 2).toFixed(2)}`,
				`| Jaw: ${scores.jawOpen.toFixed(2)}`,
				`| Yaw: ${headPose.yaw.toFixed(2)}`
			);

			// Check if current challenge is completed
			const { completed, newState } = checkChallengeCompletion(
				currentChallenge.type,
				scores,
				headPose,
				challengeStateRef.current
			);

			challengeStateRef.current = newState;

			if (completed) {
				console.log(`Challenge completed: ${currentChallenge.type}`);
				advanceToNextChallenge();
			}
		} catch (error) {
			console.error("Detection error:", error);
		}
	}, [videoRef, advanceToNextChallenge]);

	const startDetection = useCallback(async () => {
		// Generate random challenges
		const challenges = generateChallenges(config.challengeCount);
		challengesRef.current = challenges;
		currentChallengeIndexRef.current = 0;
		challengeStateRef.current = createInitialChallengeState();
		lastTimestampRef.current = 0;

		setState({
			status: "loading",
			blinkCount: 0,
			errorMessage: null,
			currentChallenge: null,
			completedChallenges: 0,
			totalChallenges: challenges.length,
		});

		try {
			await loadFaceLandmarker();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load models";
			setState((prev) => ({
				...prev,
				status: "error",
				errorMessage: message,
			}));
			return;
		}

		// Start detection
		setState((prev) => ({
			...prev,
			status: "positioning",
			currentChallenge: challenges[0],
		}));
		isDetectingRef.current = true;

		// Set up detection loop
		detectionIntervalRef.current = window.setInterval(
			runDetectionLoop,
			config.detectionInterval
		);

		// Set up timeout
		timeoutRef.current = window.setTimeout(() => {
			stopDetection();
			setState((prev) => ({ ...prev, status: "timeout" }));
		}, config.timeoutDuration);
	}, [config.challengeCount, config.detectionInterval, config.timeoutDuration, runDetectionLoop, stopDetection]);

	const reset = useCallback(() => {
		stopDetection();
		challengesRef.current = [];
		currentChallengeIndexRef.current = 0;
		challengeStateRef.current = createInitialChallengeState();
		lastTimestampRef.current = 0;
		setState({
			status: "idle",
			blinkCount: 0,
			errorMessage: null,
			currentChallenge: null,
			completedChallenges: 0,
			totalChallenges: config.challengeCount,
		});
	}, [stopDetection, config.challengeCount]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopDetection();
		};
	}, [stopDetection]);

	return {
		state,
		startDetection,
		stopDetection,
		reset,
	};
}
