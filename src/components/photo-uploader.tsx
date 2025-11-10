import { Camera, Image, SwitchCamera, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "./image-with-fallback";

interface PhotoUploaderProps {
	photoIndex: number;
	photo: string | null;
	onPhotoSelect: (photo: string) => void;
	onPhotoRemove: () => void;
}

export function PhotoUploader({
	photoIndex,
	photo,
	onPhotoSelect,
	onPhotoRemove,
}: PhotoUploaderProps) {
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [facingMode, setFacingMode] = useState<"user" | "environment">(
		"environment",
	);
	const videoRef = useRef<HTMLVideoElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				onPhotoSelect(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const startCamera = async (mode: "user" | "environment") => {
		try {
			// First try with specified camera
			let mediaStream: MediaStream;
			try {
				mediaStream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: mode } },
					audio: false,
				});
			} catch (err) {
				// Fallback: try without facingMode constraint
				console.log(
					`${mode} camera not available, trying default camera:`,
					err,
				);
				mediaStream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: false,
				});
			}

			return mediaStream;
		} catch (error) {
			console.error("Error accessing camera:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			throw new Error(
				`Unable to access camera: ${errorMessage}\n\nPlease check:\n- Camera permissions are granted\n- Camera is not in use by another app`,
			);
		}
	};

	const openCamera = async () => {
		// Check if MediaDevices API is available (requires HTTPS)
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			alert(
				"Camera API not available.\n\n" +
					"This usually means the site is not accessed via HTTPS.\n\n" +
					"Please use the 'Upload from Gallery' button instead, which will allow you to take a photo using your device's camera app.",
			);
			return;
		}

		try {
			const mediaStream = await startCamera(facingMode);
			setStream(mediaStream);
			setIsCameraOpen(true);
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			}
		}
	};

	const toggleCamera = async () => {
		const newFacingMode = facingMode === "environment" ? "user" : "environment";

		// Stop current stream
		if (stream) {
			stream.getTracks().forEach((track) => {
				track.stop();
			});
		}

		try {
			const mediaStream = await startCamera(newFacingMode);
			setStream(mediaStream);
			setFacingMode(newFacingMode);
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			}
			// Revert to previous camera on error
			try {
				const mediaStream = await startCamera(facingMode);
				setStream(mediaStream);
			} catch (revertError) {
				// If we can't revert, close camera
				closeCamera();
			}
		}
	};

	const closeCamera = () => {
		if (stream) {
			stream.getTracks().forEach((track) => {
				track.stop();
			});
			setStream(null);
		}
		setIsCameraOpen(false);
	};

	const capturePhoto = () => {
		if (videoRef.current) {
			const canvas = document.createElement("canvas");
			canvas.width = videoRef.current.videoWidth;
			canvas.height = videoRef.current.videoHeight;
			const ctx = canvas.getContext("2d");

			if (ctx) {
				ctx.drawImage(videoRef.current, 0, 0);
				const photoData = canvas.toDataURL("image/jpeg");
				onPhotoSelect(photoData);
				closeCamera();
			}
		}
	};

	useEffect(() => {
		if (stream && videoRef.current) {
			videoRef.current.srcObject = stream;
			videoRef.current.play().catch((error) => {
				console.error("Error playing video:", error);
			});
		}
	}, [stream]);

	useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach((track) => {
					track.stop();
				});
			}
		};
	}, [stream]);

	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.3 }}
			className="w-full h-full flex items-center"
		>
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-2 border-orange-500/30 backdrop-blur-sm w-full">
				{!photo ? (
					isCameraOpen ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="relative min-h-[400px]"
						>
							<div className="aspect-[3/4] max-h-[500px] bg-black rounded-3xl overflow-hidden">
								{/** biome-ignore lint/a11y/useMediaCaption: <Not needed> */}
								<video
									ref={videoRef}
									autoPlay
									playsInline
									className="w-full h-full object-cover"
								/>
							</div>
							<motion.button
								onClick={toggleCamera}
								className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg"
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
							>
								<SwitchCamera className="w-6 h-6" />
							</motion.button>
							<div className="absolute bottom-0 left-0 right-0 p-6 flex gap-3">
								<motion.button
									onClick={closeCamera}
									className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-dark to-black text-white shadow-lg"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<X className="w-5 h-5 inline mr-2" />
									<span>Cancel</span>
								</motion.button>
								<motion.button
									onClick={capturePhoto}
									className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<Camera className="w-5 h-5 inline mr-2" />
									<span>Capture</span>
								</motion.button>
							</div>
						</motion.div>
					) : (
						<div className="min-h-[400px] flex flex-col items-center justify-center gap-6 p-8">
							<motion.div
								className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center"
								animate={{
									scale: [1, 1.05, 1],
									rotate: [0, 5, -5, 0],
								}}
								transition={{
									duration: 3,
									repeat: Infinity,
									ease: "easeInOut",
								}}
							>
								<Image className="w-16 h-16 text-white" />
							</motion.div>

							<div className="text-center">
								<h3 className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
									{photoIndex === 0 ? "Take Photo 1" : "Upload Photo 2"}
								</h3>
								<p className="text-gray-400">
									{photoIndex === 0
										? "Use your camera to take the first photo"
										: "Take or upload your second photo"}
								</p>
							</div>

							<div className="flex flex-col gap-3 w-full max-w-sm">
								<motion.button
									onClick={openCamera}
									className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-pointer shadow-lg shadow-orange-500/30"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<Camera className="w-5 h-5" />
									<span>Open Camera</span>
								</motion.button>

								{photoIndex === 1 && (
									<label className="w-full">
										<input
											type="file"
											accept="image/*"
											onChange={handleFileChange}
											className="hidden"
										/>
										<motion.div
											className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gray text-white cursor-pointer shadow-lg  transition-colors"
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
										>
											<Upload className="w-5 h-5" />
											<span>Upload from Files</span>
										</motion.div>
									</label>
								)}
							</div>
						</div>
					)
				) : (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="relative min-h-[400px]"
					>
						<div className="aspect-[3/4] max-h-[500px]">
							<ImageWithFallback
								src={photo}
								alt={`Photo ${photoIndex + 1}`}
								className="w-full h-full object-cover rounded-3xl"
							/>
						</div>
						<motion.button
							onClick={onPhotoRemove}
							className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gray-dark flex items-center justify-center text-white shadow-lg"
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
						>
							<X className="w-6 h-6" />
						</motion.button>
						<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 rounded-b-3xl">
							<p className="text-white">Photo {photoIndex + 1} uploaded</p>
							<p className="text-gray-300 mt-1">
								Tap the X to remove and retake
							</p>
						</div>
					</motion.div>
				)}
			</div>
		</motion.div>
	);
}
