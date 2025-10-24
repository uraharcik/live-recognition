import { Check, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";

interface ResultDisplayProps {
	isMatch: boolean;
	confidence: number;
	onReset: () => void;
}

export function ResultDisplay({
	isMatch,
	confidence,
	onReset,
}: ResultDisplayProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.5 }}
			className="flex flex-col items-center gap-6 py-8"
		>
			{/* Result Icon */}
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
				className={`relative w-32 h-32 rounded-full flex items-center justify-center ${
					isMatch
						? "bg-gradient-to-br from-green-400 to-emerald-500"
						: "bg-gradient-to-br from-red-400 to-pink-500"
				}`}
			>
				{/* Animated rings */}
				<motion.div
					className={`absolute inset-0 rounded-full border-4 ${
						isMatch ? "border-green-300" : "border-red-300"
					}`}
					animate={{ scale: [1, 1.3, 1.3], opacity: [0.8, 0, 0] }}
					transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
				/>
				<motion.div
					className={`absolute inset-0 rounded-full border-4 ${
						isMatch ? "border-green-300" : "border-red-300"
					}`}
					animate={{ scale: [1, 1.3, 1.3], opacity: [0.8, 0, 0] }}
					transition={{
						duration: 2,
						repeat: Infinity,
						ease: "easeOut",
						delay: 0.5,
					}}
				/>

				{isMatch ? (
					<Check className="w-16 h-16 text-white" strokeWidth={3} />
				) : (
					<X className="w-16 h-16 text-white" strokeWidth={3} />
				)}
			</motion.div>

			{/* Result Text */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className="text-center"
			>
				<h2
					className={`bg-gradient-to-r ${
						isMatch
							? "from-green-400 to-emerald-500"
							: "from-red-400 to-pink-500"
					} bg-clip-text text-transparent mb-2`}
				>
					{isMatch ? "Match Found!" : "No Match"}
				</h2>
				<p className="text-muted-foreground">
					{isMatch ? "The photos appear to match" : "The photos do not match"}
				</p>
			</motion.div>

			{/* Confidence Score */}
			<motion.div
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: 0.6 }}
				className="w-full max-w-xs"
			>
				<div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 backdrop-blur-sm p-6">
					<div className="flex items-center justify-between mb-3">
						<span className="flex items-center gap-2 text-muted-foreground">
							<Sparkles className="w-4 h-4" />
							Confidence Score
						</span>
						<span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
							{confidence}%
						</span>
					</div>

					{/* Progress Bar */}
					<div className="h-2 rounded-full bg-black/20 overflow-hidden">
						<motion.div
							className={`h-full rounded-full ${
								isMatch
									? "bg-gradient-to-r from-green-400 to-emerald-500"
									: "bg-gradient-to-r from-red-400 to-pink-500"
							}`}
							initial={{ width: 0 }}
							animate={{ width: `${confidence}%` }}
							transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
						/>
					</div>
				</div>
			</motion.div>

			{/* Reset Button */}
			<motion.button
				onClick={onReset}
				className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white mt-4"
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1 }}
			>
				Try Again
			</motion.button>
		</motion.div>
	);
}
