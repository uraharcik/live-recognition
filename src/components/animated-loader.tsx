import { motion } from "motion/react";

export function AnimatedLoader() {
	return (
		<div className="flex flex-col items-center justify-center gap-5">
			<div className="relative w-24 h-24">
				{/* Outer rotating ring */}
				<motion.div
					className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400 border-r-purple-500"
					animate={{ rotate: 360 }}
					transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
				/>

				{/* Middle rotating ring */}
				<motion.div
					className="absolute inset-2 rounded-full border-[3px] border-transparent border-b-purple-400 border-l-cyan-500"
					animate={{ rotate: -360 }}
					transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
				/>

				{/* Inner pulsing core */}
				<motion.div
					className="absolute inset-5 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500"
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.5, 1, 0.5],
					}}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
				/>

				{/* Center dot */}
				<div className="absolute inset-0 flex items-center justify-center">
					<motion.div
						className="w-3 h-3 rounded-full bg-white"
						animate={{ scale: [1, 1.5, 1] }}
						transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
					/>
				</div>
			</div>

			<motion.div
				className="text-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
			>
				<motion.h3
					className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
					animate={{ opacity: [0.5, 1, 0.5] }}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
				>
					Analyzing Photos...
				</motion.h3>
				<motion.p
					className="text-muted-foreground mt-1"
					animate={{ opacity: [0.3, 0.7, 0.3] }}
					transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
				>
					AI matching in progress
				</motion.p>
			</motion.div>
		</div>
	);
}
