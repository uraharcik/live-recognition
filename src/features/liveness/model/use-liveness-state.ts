import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialBlinkState, detectBlink } from "../lib/blink-detector";
import { DEFAULT_LIVENESS_CONFIG } from "../lib/constants";
import { loadFaceLandmarker } from "./face-api-loader";
import type { BlinkState, LivenessConfig, LivenessState } from "./types";

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
	});

	const blinkStateRef = useRef<BlinkState>(createInitialBlinkState());
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

	const runDetectionLoop = useCallback(async () => {
		const video = videoRef.current;
		if (!video || !isDetectingRef.current) return;

		const faceLandmarker = (await loadFaceLandmarker());
		if (!faceLandmarker) return;

		try {
			const timestamp = performance.now();
			// Ensure timestamp is always increasing
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

			// Face detected, switch to detecting mode
			setState((prev) => {
				if (prev.status === "positioning") {
					return { ...prev, status: "detecting" };
				}
				return prev;
			});

			// Debug: log full face mesh result
			console.log("Face Mesh Result:", {
				faceLandmarks: result.faceLandmarks?.[0]?.length,
				faceBlendshapes: result.faceBlendshapes?.[0]?.categories?.map(c => ({
					name: c.categoryName,
					score: c.score.toFixed(3)
				})),
				facialTransformationMatrixes: result.facialTransformationMatrixes?.[0]
			});

			// Get blink values from blendshapes
			const blendshapes = result.faceBlendshapes?.[0]?.categories;
			if (!blendshapes) {
				console.log("No blendshapes found");
				return;
			}

			// Find eyeBlinkLeft and eyeBlinkRight
			const eyeBlinkLeft = blendshapes.find(b => b.categoryName === "eyeBlinkLeft")?.score ?? 0;
			const eyeBlinkRight = blendshapes.find(b => b.categoryName === "eyeBlinkRight")?.score ?? 0;
			const averageBlink = (eyeBlinkLeft + eyeBlinkRight) / 2;

			// Debug: log blink values
			console.log(
				"Blink L:", eyeBlinkLeft.toFixed(3),
				"| R:", eyeBlinkRight.toFixed(3),
				"| Avg:", averageBlink.toFixed(3),
				"| Closed:", blinkStateRef.current.isEyesClosed
			);

			// Use blink score as inverse EAR (higher = more closed)
			const { newState, blinkDetected } = detectBlink(
				averageBlink,
				blinkStateRef.current,
				config
			);

			blinkStateRef.current = newState;

			if (blinkDetected) {
				console.log("Blink detected! Count:", newState.blinkCount);
				setState((prev) => ({
					...prev,
					blinkCount: newState.blinkCount,
				}));

				// Check if we have enough blinks
				if (newState.blinkCount >= config.requiredBlinks) {
					stopDetection();
					setState((prev) => ({ ...prev, status: "success" }));

					const image = captureImage();
					if (image) {
						onSuccess(image);
					}
				}
			}
		} catch (error) {
			console.error("Detection error:", error);
		}
	}, [videoRef, config, stopDetection, captureImage, onSuccess]);

	const startDetection = useCallback(async () => {
		setState({
			status: "loading",
			blinkCount: 0,
			errorMessage: null,
		});
		blinkStateRef.current = createInitialBlinkState();
		lastTimestampRef.current = 0;

		try {
			await loadFaceLandmarker();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load models";
			setState({
				status: "error",
				blinkCount: 0,
				errorMessage: message,
			});
			return;
		}

		// Start detection
		setState((prev) => ({ ...prev, status: "positioning" }));
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
	}, [config.detectionInterval, config.timeoutDuration, runDetectionLoop, stopDetection]);

	const reset = useCallback(() => {
		stopDetection();
		blinkStateRef.current = createInitialBlinkState();
		lastTimestampRef.current = 0;
		setState({
			status: "idle",
			blinkCount: 0,
			errorMessage: null,
		});
	}, [stopDetection]);

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
