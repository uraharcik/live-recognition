import { motion } from "motion/react";
import { STATUS_MESSAGES } from "../lib/constants";
import type { LivenessStatus } from "../model/types";

interface LivenessOverlayProps {
	status: LivenessStatus;
	blinkCount: number;
	requiredBlinks: number;
}

export function LivenessOverlay({
	status,
	blinkCount,
	requiredBlinks,
}: LivenessOverlayProps) {
	const message = STATUS_MESSAGES[status] ?? "Please wait...";

	const isActive = status === "detecting" || status === "positioning";
	const isSuccess = status === "success";
	const isError = status === "timeout" || status === "error";

	return (
		<div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-8">
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
						status === "detecting"
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
					key={status}
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
					<p className="text-white font-medium">{message}</p>
					{status === "detecting" && requiredBlinks > 1 && (
						<p className="text-white/70 text-sm mt-1">
							Blinks: {blinkCount} / {requiredBlinks}
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
