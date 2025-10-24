import { Check } from "lucide-react";
import { motion } from "motion/react";

interface StepIndicatorProps {
	currentStep: number;
	totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
	return (
		<div className="w-full p-4">
			<div className="flex items-center justify-between relative">
				<div className="absolute top-4 left-5 right-5 h-1 bg-white/10 rounded-full">
					<motion.div
						className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
						initial={{ width: "0%" }}
						animate={{
							width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
						}}
						transition={{ duration: 0.5, ease: "easeInOut" }}
					/>
				</div>

				{Array.from({ length: totalSteps }).map((_, index) => {
					const stepNumber = index + 1;
					const isCompleted = stepNumber < currentStep;
					const isCurrent = stepNumber === currentStep;

					return (
						<motion.div
							key={stepNumber}
							className="relative z-10 flex flex-col items-center"
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.1 }}
						>
							<motion.div
								className={`size-9 rounded-full flex items-center justify-center border-2 transition-all ${
									isCompleted
										? "bg-gradient-to-br from-cyan-400 to-purple-500 border-2 border-yellow-300"
										: isCurrent
											? "bg-slate-950 border-cyan-400 shadow-lg shadow-cyan-400/50"
											: "bg-slate-900 border-white/20"
								}`}
								animate={
									isCurrent
										? {
												scale: [1, 1.1, 1],
												boxShadow: [
													"0 0 0 0 rgba(34, 211, 238, 0)",
													"0 0 0 8px rgba(34, 211, 238, 0.2)",
													"0 0 0 0 rgba(34, 211, 238, 0)",
												],
											}
										: {}
								}
								transition={{ duration: 2, repeat: Infinity }}
							>
								{isCompleted ? (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", stiffness: 200 }}
									>
										<Check className="w-5 h-5 text-white" strokeWidth={3} />
									</motion.div>
								) : (
									<span
										className={`${
											isCurrent ? "text-cyan-400" : "text-gray-500"
										}`}
									>
										{stepNumber}
									</span>
								)}
							</motion.div>

							<motion.p
								className={`mt-2 ${
									isCurrent
										? "text-cyan-400"
										: isCompleted
											? "text-purple-400"
											: "text-gray-600"
								}`}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: index * 0.1 + 0.2 }}
							>
								Step {stepNumber}
							</motion.p>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}
