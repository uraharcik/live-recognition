import { motion } from "motion/react";
import { STATUS_MESSAGES } from "../lib/constants";
import type { Challenge, LivenessStatus } from "../model/types";

interface LivenessOverlayProps {
	status: LivenessStatus;
	currentChallenge: Challenge | null;
	completedChallenges: number;
	totalChallenges: number;
}

export function LivenessOverlay({
	status,
	currentChallenge,
	completedChallenges,
	totalChallenges,
}: LivenessOverlayProps) {
	const getMessage = () => {
		if (status === "challenge" && currentChallenge) {
			return currentChallenge.instruction;
		}
		return STATUS_MESSAGES[status] ?? "Please wait...";
	};

	const isActive = status === "challenge" || status === "positioning";
	const isSuccess = status === "success";
	const isError = status === "timeout" || status === "error";

	return (
		<div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-8">
			{/* Progress indicator */}
			{(status === "challenge" || status === "positioning") && totalChallenges > 0 && (
				<div className="absolute top-4 left-0 right-0 px-4">
					<div className="flex justify-center gap-2">
						{Array.from({ length: totalChallenges }).map((_, i) => (
							<motion.div
								key={i}
								className={`h-2 w-12 rounded-full ${
									i < completedChallenges
										? "bg-green-500"
										: i === completedChallenges
											? "bg-orange-500"
											: "bg-white/30"
								}`}
								initial={{ scale: 0.8 }}
								animate={{
									scale: i === completedChallenges ? [1, 1.1, 1] : 1,
								}}
								transition={{
									duration: 0.5,
									repeat: i === completedChallenges ? Infinity : 0,
								}}
							/>
						))}
					</div>
				</div>
			)}

			{/* Face frame guide */}
			<div className="flex-1 flex items-center justify-center">
				<motion.div
					className={`w-56 h-72 rounded-[100px] border-4 ${
						isSuccess
							? "border-green-500"
							: isError
								? "border-red-500"
								: isActive
									? "border-orange-500"
									: "border-white/50"
					}`}
					animate={
						status === "challenge"
							? {
									boxShadow: [
										"0 0 0 0 rgba(249, 115, 22, 0)",
										"0 0 0 12px rgba(249, 115, 22, 0.3)",
										"0 0 0 0 rgba(249, 115, 22, 0)",
									],
								}
							: {}
					}
					transition={{
						duration: 1.5,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			</div>

			{/* Status message */}
			<div className="absolute bottom-20 left-0 right-0 px-4">
				<motion.div
					key={`${status}-${currentChallenge?.type}`}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className={`text-center py-3 px-6 rounded-2xl backdrop-blur-md ${
						isSuccess
							? "bg-green-500/80"
							: isError
								? "bg-red-500/80"
								: "bg-black/60"
					}`}
				>
					<p className="text-white font-medium text-lg">{getMessage()}</p>
					{status === "challenge" && (
						<p className="text-white/70 text-sm mt-1">
							Challenge {completedChallenges + 1} of {totalChallenges}
						</p>
					)}
				</motion.div>
			</div>

			{/* Loading indicator */}
			{status === "loading" && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/40">
					<motion.div
						className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
						animate={{ rotate: 360 }}
						transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
					/>
				</div>
			)}
		</div>
	);
}
