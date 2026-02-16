import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	checkChallengeCompletion,
	createInitialChallengeState,
	extractBlendshapeScores,
	extractHeadPose,
	type ChallengeState,
} from "@/features/liveness/lib/challenge-detector";
import { loadFaceLandmarker } from "@/features/liveness/model/face-api-loader";
import type { ChallengeType } from "@/features/liveness/model/types";

export const Route = createFileRoute("/test")({
	component: ChallengeTestPage,
});

const ALL_CHALLENGES: ChallengeType[] = [
	"blink",
	"turnLeft",
	"turnRight",
	"smile",
	"openMouth",
	"raiseEyebrows",
	"squint",
	"puffCheeks",
	"lookUp",
	"lookDown",
	"winkLeft",
	"winkRight",
	"purseLips",
	"frown",
];

const CHALLENGE_LABELS: Record<ChallengeType, string> = {
	blink: "Blink",
	turnLeft: "Turn Left",
	turnRight: "Turn Right",
	smile: "Smile",
	openMouth: "Open Mouth",
	raiseEyebrows: "Raise Eyebrows",
	squint: "Squint",
	puffCheeks: "Puff Cheeks",
	lookUp: "Look Up",
	lookDown: "Look Down",
	winkLeft: "Wink Left",
	winkRight: "Wink Right",
	purseLips: "Purse Lips",
	frown: "Frown",
};

interface BlendshapeData {
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
	cheekPuff: number;
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

interface HeadPoseData {
	yaw: number;
	pitch: number;
}

const THRESHOLDS: Record<string, number> = {
	blink: 0.5,
	smile: 0.4,
	jawOpen: 0.3,
	headTurn: 0.15,
	browRaise: 0.35,
	squint: 0.4,
	cheekPuff: 0.3,
	eyeLook: 0.4,
	wink: 0.5,
	winkOpenEye: 0.3,
	purseLips: 0.4,
	frown: 0.3,
};

function getRelevantMetrics(
	challenge: ChallengeType,
	scores: BlendshapeData,
	headPose: HeadPoseData,
): Array<{ label: string; value: number; threshold: number; inverted?: boolean }> {
	switch (challenge) {
		case "blink":
			return [
				{
					label: "Avg Blink",
					value: (scores.eyeBlinkLeft + scores.eyeBlinkRight) / 2,
					threshold: THRESHOLDS.blink,
				},
				{ label: "L Eye Blink", value: scores.eyeBlinkLeft, threshold: THRESHOLDS.blink },
				{ label: "R Eye Blink", value: scores.eyeBlinkRight, threshold: THRESHOLDS.blink },
			];
		case "turnLeft":
			return [
				{
					label: "Head Yaw",
					value: headPose.yaw,
					threshold: -THRESHOLDS.headTurn,
					inverted: true,
				},
			];
		case "turnRight":
			return [
				{ label: "Head Yaw", value: headPose.yaw, threshold: THRESHOLDS.headTurn },
			];
		case "smile":
			return [
				{
					label: "Avg Smile",
					value: (scores.mouthSmileLeft + scores.mouthSmileRight) / 2,
					threshold: THRESHOLDS.smile,
				},
				{ label: "L Smile", value: scores.mouthSmileLeft, threshold: THRESHOLDS.smile },
				{ label: "R Smile", value: scores.mouthSmileRight, threshold: THRESHOLDS.smile },
			];
		case "openMouth":
			return [
				{ label: "Jaw Open", value: scores.jawOpen, threshold: THRESHOLDS.jawOpen },
			];
		case "raiseEyebrows":
			return [
				{
					label: "Avg Brow",
					value:
						(scores.browOuterUpLeft + scores.browOuterUpRight + scores.browInnerUp) / 3,
					threshold: THRESHOLDS.browRaise,
				},
				{ label: "Inner Up", value: scores.browInnerUp, threshold: THRESHOLDS.browRaise },
				{
					label: "L Outer Up",
					value: scores.browOuterUpLeft,
					threshold: THRESHOLDS.browRaise,
				},
				{
					label: "R Outer Up",
					value: scores.browOuterUpRight,
					threshold: THRESHOLDS.browRaise,
				},
			];
		case "squint":
			return [
				{
					label: "Avg Squint",
					value: (scores.eyeSquintLeft + scores.eyeSquintRight) / 2,
					threshold: THRESHOLDS.squint,
				},
				{
					label: "Avg Blink (must be <0.5)",
					value: (scores.eyeBlinkLeft + scores.eyeBlinkRight) / 2,
					threshold: THRESHOLDS.blink,
					inverted: true,
				},
			];
		case "puffCheeks":
			return [
				{ label: "Cheek Puff", value: scores.cheekPuff, threshold: THRESHOLDS.cheekPuff },
			];
		case "lookUp":
			return [
				{
					label: "Avg Look Up",
					value: (scores.eyeLookUpLeft + scores.eyeLookUpRight) / 2,
					threshold: THRESHOLDS.eyeLook,
				},
				{ label: "L Look Up", value: scores.eyeLookUpLeft, threshold: THRESHOLDS.eyeLook },
				{
					label: "R Look Up",
					value: scores.eyeLookUpRight,
					threshold: THRESHOLDS.eyeLook,
				},
			];
		case "lookDown":
			return [
				{
					label: "Avg Look Down",
					value: (scores.eyeLookDownLeft + scores.eyeLookDownRight) / 2,
					threshold: THRESHOLDS.eyeLook,
				},
				{
					label: "L Look Down",
					value: scores.eyeLookDownLeft,
					threshold: THRESHOLDS.eyeLook,
				},
				{
					label: "R Look Down",
					value: scores.eyeLookDownRight,
					threshold: THRESHOLDS.eyeLook,
				},
			];
		case "winkLeft":
			return [
				{
					label: "L Eye Blink (>0.5)",
					value: scores.eyeBlinkLeft,
					threshold: THRESHOLDS.wink,
				},
				{
					label: "R Eye Blink (<0.3)",
					value: scores.eyeBlinkRight,
					threshold: THRESHOLDS.winkOpenEye,
					inverted: true,
				},
			];
		case "winkRight":
			return [
				{
					label: "R Eye Blink (>0.5)",
					value: scores.eyeBlinkRight,
					threshold: THRESHOLDS.wink,
				},
				{
					label: "L Eye Blink (<0.3)",
					value: scores.eyeBlinkLeft,
					threshold: THRESHOLDS.winkOpenEye,
					inverted: true,
				},
			];
		case "purseLips":
			return [
				{
					label: "Mouth Pucker",
					value: scores.mouthPucker,
					threshold: THRESHOLDS.purseLips,
				},
			];
		case "frown":
			return [
				{
					label: "Avg Mouth Frown",
					value: (scores.mouthFrownLeft + scores.mouthFrownRight) / 2,
					threshold: THRESHOLDS.frown,
				},
				{
					label: "Avg Brow Down",
					value: (scores.browDownLeft + scores.browDownRight) / 2,
					threshold: THRESHOLDS.frown,
				},
			];
		default:
			return [];
	}
}

function MetricBar({
	label,
	value,
	threshold,
	inverted,
}: {
	label: string;
	value: number;
	threshold: number;
	inverted?: boolean;
}) {
	const normalizedValue = Math.min(Math.max(Math.abs(value), 0), 1);
	const absThreshold = Math.abs(threshold);
	const isTriggered = inverted ? value < threshold : value > threshold;
	const percentage = normalizedValue * 100;
	const thresholdPercentage = absThreshold * 100;

	return (
		<div className="mb-2">
			<div className="flex justify-between text-xs mb-0.5">
				<span className="text-gray-300">{label}</span>
				<span className={isTriggered ? "text-green-400 font-bold" : "text-gray-400"}>
					{value.toFixed(3)}
				</span>
			</div>
			<div className="relative h-4 bg-gray-800 rounded overflow-hidden">
				<div
					className={`absolute inset-y-0 left-0 rounded transition-all duration-75 ${
						isTriggered ? "bg-green-500" : "bg-orange-500"
					}`}
					style={{ width: `${percentage}%` }}
				/>
				<div
					className="absolute inset-y-0 w-0.5 bg-white/80"
					style={{ left: `${thresholdPercentage}%` }}
				/>
				<span
					className="absolute text-[9px] text-white/60 top-0"
					style={{ left: `${thresholdPercentage + 1}%` }}
				>
					{absThreshold}
				</span>
			</div>
		</div>
	);
}

function ChallengeTestPage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedChallenge, setSelectedChallenge] = useState<ChallengeType>("blink");
	const [scores, setScores] = useState<BlendshapeData | null>(null);
	const [headPose, setHeadPose] = useState<HeadPoseData>({ yaw: 0, pitch: 0 });
	const [challengeState, setChallengeState] = useState<ChallengeState>(
		createInitialChallengeState(),
	);
	const [completedLog, setCompletedLog] = useState<
		Array<{ challenge: ChallengeType; time: string; success: boolean }>
	>([]);
	const [faceDetected, setFaceDetected] = useState(false);

	const intervalRef = useRef<number | null>(null);
	const lastTimestampRef = useRef(0);
	const challengeStateRef = useRef<ChallengeState>(createInitialChallengeState());

	const stopDetection = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		setIsRunning(false);
	}, []);

	const resetChallenge = useCallback(() => {
		const fresh = createInitialChallengeState();
		challengeStateRef.current = fresh;
		setChallengeState(fresh);
	}, []);

	const runFrame = useCallback(async () => {
		const video = videoRef.current;
		if (!video) return;

		const faceLandmarker = await loadFaceLandmarker();
		if (!faceLandmarker) return;

		const timestamp = performance.now();
		if (timestamp <= lastTimestampRef.current) return;
		lastTimestampRef.current = timestamp;

		const result = faceLandmarker.detectForVideo(video, timestamp);

		if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
			setFaceDetected(false);
			return;
		}

		setFaceDetected(true);

		const blendshapes = result.faceBlendshapes?.[0]?.categories;
		if (!blendshapes) return;

		const extracted = extractBlendshapeScores(blendshapes);
		const landmarks = result.faceLandmarks[0];
		const pose = extractHeadPose(landmarks);

		setScores(extracted);
		setHeadPose(pose);

		const { completed, newState } = checkChallengeCompletion(
			selectedChallenge,
			extracted,
			pose,
			challengeStateRef.current,
		);

		challengeStateRef.current = newState;
		setChallengeState(newState);

		if (completed) {
			setCompletedLog((prev) => [
				{
					challenge: selectedChallenge,
					time: new Date().toLocaleTimeString(),
					success: true,
				},
				...prev.slice(0, 19),
			]);
			// Reset state after completion for re-testing
			const fresh = createInitialChallengeState();
			challengeStateRef.current = fresh;
			setChallengeState(fresh);
		}
	}, [selectedChallenge]);

	const startDetection = useCallback(async () => {
		setIsLoading(true);
		try {
			await loadFaceLandmarker();
		} catch (err) {
			console.error("Failed to load model:", err);
			setIsLoading(false);
			return;
		}
		setIsLoading(false);
		setIsRunning(true);
		lastTimestampRef.current = 0;
		intervalRef.current = window.setInterval(runFrame, 50);
	}, [runFrame]);

	// Start camera on mount
	useEffect(() => {
		let mounted = true;
		const init = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: "user" } },
					audio: false,
				});
				if (mounted && videoRef.current) {
					videoRef.current.srcObject = stream;
					videoRef.current.play().catch(console.error);
				} else {
					stream.getTracks().forEach((t) => t.stop());
				}
			} catch (err) {
				console.error("Camera error:", err);
			}
		};
		init();
		return () => {
			mounted = false;
		};
	}, []);

	// Restart detection loop when challenge changes
	useEffect(() => {
		if (!isRunning) return;
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
		lastTimestampRef.current = 0;
		intervalRef.current = window.setInterval(runFrame, 50);
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isRunning, runFrame]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			const video = videoRef.current;
			if (video?.srcObject) {
				const stream = video.srcObject;
				if (stream instanceof MediaStream) {
					stream.getTracks().forEach((t) => t.stop());
				}
			}
		};
	}, []);

	const metrics = scores ? getRelevantMetrics(selectedChallenge, scores, headPose) : [];

	return (
		<div className="min-h-screen bg-gray-950 text-white p-4">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">Challenge Testing Frame</h1>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
					{/* Left: Camera + Controls */}
					<div className="lg:col-span-1">
						{/* Camera feed */}
						<div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden mb-4">
							{/* biome-ignore lint/a11y/useMediaCaption: test camera */}
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="w-full h-full object-cover scale-x-[-1]"
							/>
							{/* Face status indicator */}
							<div
								className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${
									faceDetected
										? "bg-green-500/80 text-white"
										: "bg-red-500/80 text-white"
								}`}
							>
								{faceDetected ? "Face Detected" : "No Face"}
							</div>
							{isRunning && (
								<div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/80 text-white animate-pulse">
									Detecting
								</div>
							)}
						</div>

						{/* Start/Stop */}
						<div className="flex gap-2 mb-4">
							{!isRunning ? (
								<button
									type="button"
									onClick={startDetection}
									disabled={isLoading}
									className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 transition font-medium disabled:opacity-50"
								>
									{isLoading ? "Loading Model..." : "Start Detection"}
								</button>
							) : (
								<button
									type="button"
									onClick={stopDetection}
									className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 transition font-medium"
								>
									Stop
								</button>
							)}
							<button
								type="button"
								onClick={resetChallenge}
								className="px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition font-medium"
							>
								Reset State
							</button>
						</div>

						{/* Challenge State */}
						<div className="bg-gray-900 rounded-xl p-3 mb-4">
							<h3 className="text-sm font-medium text-gray-400 mb-2">
								Internal Challenge State
							</h3>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div className="flex justify-between">
									<span className="text-gray-500">eyesClosed</span>
									<span
										className={
											challengeState.eyesClosed
												? "text-green-400"
												: "text-gray-600"
										}
									>
										{String(challengeState.eyesClosed)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">eyesClosedTime</span>
									<span className="text-gray-400">
										{challengeState.eyesClosedTime
											? `${Date.now() - challengeState.eyesClosedTime}ms`
											: "null"}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">turnedLeft</span>
									<span
										className={
											challengeState.turnedLeft
												? "text-green-400"
												: "text-gray-600"
										}
									>
										{String(challengeState.turnedLeft)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">turnedRight</span>
									<span
										className={
											challengeState.turnedRight
												? "text-green-400"
												: "text-gray-600"
										}
									>
										{String(challengeState.turnedRight)}
									</span>
								</div>
							</div>
						</div>

						{/* Head Pose */}
						<div className="bg-gray-900 rounded-xl p-3">
							<h3 className="text-sm font-medium text-gray-400 mb-2">Head Pose</h3>
							<div className="space-y-2">
								<div>
									<div className="flex justify-between text-xs mb-0.5">
										<span className="text-gray-400">Yaw (L/R)</span>
										<span className="text-gray-300">
											{headPose.yaw.toFixed(3)}
										</span>
									</div>
									<div className="relative h-3 bg-gray-800 rounded overflow-hidden">
										<div className="absolute inset-y-0 left-1/2 w-px bg-gray-600" />
										<div
											className="absolute inset-y-0 w-2 bg-orange-500 rounded"
											style={{
												left: `${50 + headPose.yaw * 50}%`,
												transform: "translateX(-50%)",
											}}
										/>
									</div>
								</div>
								<div>
									<div className="flex justify-between text-xs mb-0.5">
										<span className="text-gray-400">Pitch (U/D)</span>
										<span className="text-gray-300">
											{headPose.pitch.toFixed(3)}
										</span>
									</div>
									<div className="relative h-3 bg-gray-800 rounded overflow-hidden">
										<div className="absolute inset-y-0 left-1/2 w-px bg-gray-600" />
										<div
											className="absolute inset-y-0 w-2 bg-orange-500 rounded"
											style={{
												left: `${50 + headPose.pitch * 50}%`,
												transform: "translateX(-50%)",
											}}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Center: Challenge selector + metrics */}
					<div className="lg:col-span-1">
						{/* Challenge selector */}
						<div className="bg-gray-900 rounded-xl p-3 mb-4">
							<h3 className="text-sm font-medium text-gray-400 mb-2">
								Select Challenge
							</h3>
							<div className="grid grid-cols-2 gap-1.5">
								{ALL_CHALLENGES.map((ch) => (
									<button
										key={ch}
										type="button"
										onClick={() => {
											setSelectedChallenge(ch);
											resetChallenge();
										}}
										className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
											selectedChallenge === ch
												? "bg-orange-500 text-white"
												: "bg-gray-800 text-gray-400 hover:bg-gray-700"
										}`}
									>
										{CHALLENGE_LABELS[ch]}
									</button>
								))}
							</div>
						</div>

						{/* Relevant metrics for selected challenge */}
						<div className="bg-gray-900 rounded-xl p-3 mb-4">
							<h3 className="text-sm font-medium text-gray-400 mb-2">
								Metrics for: {CHALLENGE_LABELS[selectedChallenge]}
							</h3>
							{metrics.length > 0 ? (
								metrics.map((m) => (
									<MetricBar
										key={m.label}
										label={m.label}
										value={m.value}
										threshold={m.threshold}
										inverted={m.inverted}
									/>
								))
							) : (
								<p className="text-gray-600 text-xs">Start detection to see metrics</p>
							)}
						</div>

						{/* Completion log */}
						<div className="bg-gray-900 rounded-xl p-3">
							<div className="flex justify-between items-center mb-2">
								<h3 className="text-sm font-medium text-gray-400">
									Completion Log
								</h3>
								<button
									type="button"
									onClick={() => setCompletedLog([])}
									className="text-xs text-gray-600 hover:text-gray-400"
								>
									Clear
								</button>
							</div>
							{completedLog.length === 0 ? (
								<p className="text-gray-600 text-xs">
									No completions yet. Perform challenges to test.
								</p>
							) : (
								<div className="space-y-1 max-h-64 overflow-y-auto">
									{completedLog.map((entry, i) => (
										<div
											key={`${entry.time}-${i}`}
											className="flex justify-between text-xs py-1 border-b border-gray-800"
										>
											<span className="text-green-400">
												{CHALLENGE_LABELS[entry.challenge]}
											</span>
											<span className="text-gray-500">{entry.time}</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Right: All blendshapes raw view */}
					<div className="lg:col-span-1">
						<div className="bg-gray-900 rounded-xl p-3">
							<h3 className="text-sm font-medium text-gray-400 mb-2">
								All Blendshape Scores
							</h3>
							{scores ? (
								<div className="space-y-1.5 max-h-[calc(100vh-120px)] overflow-y-auto">
									{(
										Object.entries(scores) as Array<
											[keyof BlendshapeData, number]
										>
									).map(([key, value]) => (
										<div key={key}>
											<div className="flex justify-between text-[10px] mb-0.5">
												<span className="text-gray-500">{key}</span>
												<span
													className={
														value > 0.3
															? "text-orange-400"
															: "text-gray-600"
													}
												>
													{value.toFixed(3)}
												</span>
											</div>
											<div className="relative h-2 bg-gray-800 rounded overflow-hidden">
												<div
													className={`absolute inset-y-0 left-0 rounded transition-all duration-75 ${
														value > 0.3
															? "bg-orange-500/70"
															: "bg-gray-600"
													}`}
													style={{
														width: `${Math.min(value * 100, 100)}%`,
													}}
												/>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-600 text-xs">
									Start detection to see scores
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}