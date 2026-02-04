import { SwitchCamera, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_LIVENESS_CONFIG } from "../lib/constants";
import type { LivenessConfig } from "../model/types";
import { useLivenessState } from "../model/use-liveness-state";
import { LivenessOverlay } from "./liveness-overlay";

interface LivenessDetectorProps {
	onSuccess: (capturedImage: string) => void;
	onCancel: () => void;
	config?: Partial<LivenessConfig>;
}

export function LivenessDetector({
	onSuccess,
	onCancel,
	config: configOverrides,
}: LivenessDetectorProps) {
	const config = { ...DEFAULT_LIVENESS_CONFIG, ...configOverrides };
	const videoRef = useRef<HTMLVideoElement>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

	const { state, startDetection, reset } = useLivenessState({
		videoRef,
		onSuccess,
		config,
	});

	const startCamera = async (mode: "user" | "environment") => {
		try {
			let mediaStream: MediaStream;
			try {
				mediaStream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: mode } },
					audio: false,
				});
			} catch {
				// Fallback to default camera
				mediaStream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: false,
				});
			}
			return mediaStream;
		} catch (error) {
			console.error("Error accessing camera:", error);
			throw error;
		}
	};

	const stopCamera = () => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			setStream(null);
		}
	};

	const toggleCamera = async () => {
		const newFacingMode = facingMode === "user" ? "environment" : "user";
		stopCamera();
		reset();

		try {
			const mediaStream = await startCamera(newFacingMode);
			setStream(mediaStream);
			setFacingMode(newFacingMode);
		} catch {
			// Revert on error
			try {
				const mediaStream = await startCamera(facingMode);
				setStream(mediaStream);
			} catch {
				onCancel();
			}
		}
	};

	const handleCancel = () => {
		stopCamera();
		reset();
		onCancel();
	};

	const handleRetry = () => {
		reset();
		startDetection();
	};

	// Initialize camera on mount
	useEffect(() => {
		let mounted = true;

		const init = async () => {
			try {
				const mediaStream = await startCamera(facingMode);
				if (mounted) {
					setStream(mediaStream);
				} else {
					mediaStream.getTracks().forEach((track) => track.stop());
				}
			} catch {
				if (mounted) {
					onCancel();
				}
			}
		};

		init();

		return () => {
			mounted = false;
		};
	}, []);

	// Set video source when stream changes
	useEffect(() => {
		if (stream && videoRef.current) {
			videoRef.current.srcObject = stream;
			videoRef.current.play().catch(console.error);
		}
	}, [stream]);

	// Start detection when video is ready
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !stream) return;

		const handleCanPlay = () => {
			if (state.status === "idle") {
				startDetection();
			}
		};

		video.addEventListener("canplay", handleCanPlay);
		return () => video.removeEventListener("canplay", handleCanPlay);
	}, [stream, state.status, startDetection]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopCamera();
		};
	}, []);

	const showRetry = state.status === "timeout" || state.status === "error";

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="relative min-h-[400px]"
		>
			<div className="aspect-[3/4] max-h-[500px] bg-black rounded-3xl overflow-hidden relative">
				{/* biome-ignore lint/a11y/useMediaCaption: Not needed for camera feed */}
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className="w-full h-full object-cover"
				/>
				<LivenessOverlay
					status={state.status}
					currentChallenge={state.currentChallenge}
					completedChallenges={state.completedChallenges}
					totalChallenges={state.totalChallenges}
				/>
			</div>

			{/* Camera switch button */}
			<motion.button
				onClick={toggleCamera}
				className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg"
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.9 }}
			>
				<SwitchCamera className="w-6 h-6" />
			</motion.button>

			{/* Action buttons */}
			<div className="absolute bottom-0 left-0 right-0 p-6 flex gap-3">
				<motion.button
					onClick={handleCancel}
					className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-dark to-black text-white shadow-lg"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<X className="w-5 h-5 inline mr-2" />
					<span>Cancel</span>
				</motion.button>

				{showRetry && (
					<motion.button
						onClick={handleRetry}
						className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<span>Try Again</span>
					</motion.button>
				)}
			</div>
		</motion.div>
	);
}
