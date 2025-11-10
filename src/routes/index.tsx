import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AnimatedLoader } from "../components/animated-loader";
import { PhotoUploader } from "../components/photo-uploader";
import { ResultDisplay } from "../components/result-display";
import { StepIndicator } from "../components/step-indicator";
import { verifyImages } from "@/shared/api";
export const Route = createFileRoute("/")({
	component: App,
});

type Step = 1 | 2 | 3 | 4;

export default function App() {
	const [currentStep, setCurrentStep] = useState<Step>(1);
	const [photo1, setPhoto1] = useState<string | null>(null);
	const [photo2, setPhoto2] = useState<string | null>(null);
	const [matchResult, setMatchResult] = useState<{
		isMatch: boolean;
		confidence: number;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Real AI matching service
	const analyzePhotos = async () => {
		if (!photo1 || !photo2) {
			setError("Both photos are required");
			return;
		}

		setCurrentStep(3);
		setError(null);

		try {
			const result = await verifyImages(photo1, photo2);
			setMatchResult(result);
			setCurrentStep(4);
		} catch (err) {
			console.error("Verification error:", err);
			setError(
				err instanceof Error ? err.message : "Failed to verify images. Please try again.",
			);
			setCurrentStep(2);
		}
	};

	const handleReset = () => {
		setCurrentStep(1);
		setPhoto1(null);
		setPhoto2(null);
		setMatchResult(null);
		setError(null);
	};

	const handleNextFromStep1 = () => {
		if (photo1) {
			setCurrentStep(2);
		}
	};

	const handleBackToStep1 = () => {
		setCurrentStep(1);
	};

	const handleNextFromStep2 = () => {
		if (photo2) {
			analyzePhotos();
		}
	};

	return (
		<div className="h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
			<div className="relative z-10 min-h-screen flex flex-col max-w-md mx-auto">
				{currentStep !== 3 && currentStep !== 4 && (
					<StepIndicator currentStep={currentStep} totalSteps={2} />
				)}

				{/* Content Area */}
				<div className="flex-1 flex items-center justify-center px-6 py-6">
					<AnimatePresence mode="wait">
						{currentStep === 1 && (
							<motion.div
								key="step1"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								className="w-full"
							>
								<PhotoUploader
									photoIndex={0}
									photo={photo1}
									onPhotoSelect={setPhoto1}
									onPhotoRemove={() => setPhoto1(null)}
								/>

								<motion.button
									onClick={handleNextFromStep1}
									disabled={!photo1}
									className={`w-full mt-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${
										photo1
											? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/30"
											: "bg-gray-800 text-gray-500 cursor-not-allowed"
									}`}
									whileHover={photo1 ? { scale: 1.02 } : {}}
									whileTap={photo1 ? { scale: 0.98 } : {}}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
								>
									{photo1 ? (
										<>
											<span>Continue to Photo 2</span>
											<ArrowRight className="w-5 h-5" />
										</>
									) : (
										"Upload photo to continue"
									)}
								</motion.button>
							</motion.div>
						)}

						{currentStep === 2 && (
							<motion.div
								key="step2"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								className="w-full"
							>
								<PhotoUploader
									photoIndex={1}
									photo={photo2}
									onPhotoSelect={setPhoto2}
									onPhotoRemove={() => setPhoto2(null)}
								/>

								{error && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm"
									>
										{error}
									</motion.div>
								)}

								<div className="flex gap-3 mt-6">
									<motion.button
										onClick={handleBackToStep1}
										className="px-6 py-4 rounded-2xl bg-gray-800 text-white flex items-center gap-2"
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
									>
										<ArrowLeft className="w-5 h-5" />
										<span>Back</span>
									</motion.button>

									<motion.button
										onClick={handleNextFromStep2}
										disabled={!photo2}
										className={`flex-1 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${
											photo2
												? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-purple-500/30"
												: "bg-gray-800 text-gray-500 cursor-not-allowed"
										}`}
										whileHover={photo2 ? { scale: 1.02 } : {}}
										whileTap={photo2 ? { scale: 0.98 } : {}}
									>
										{photo2 ? (
											<>
												<Sparkles className="w-5 h-5" />
												<span>Analyze Photos</span>
											</>
										) : (
											"Upload photo to continue"
										)}
									</motion.button>
								</div>
							</motion.div>
						)}

						{currentStep === 3 && (
							<motion.div
								key="analyzing"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
							>
								<AnimatedLoader />
							</motion.div>
						)}

						{currentStep === 4 && matchResult && (
							<motion.div
								key="result"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0 }}
								className="w-full"
							>
								<ResultDisplay
									isMatch={matchResult.isMatch}
									confidence={matchResult.confidence}
									onReset={handleReset}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Footer */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					className="text-center py-6 px-6 text-gray-500"
				>
					<p>Powered by RPA Technology</p>
				</motion.div>
			</div>
		</div>
	);
}
