import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let loadingPromise: Promise<FaceLandmarker> | null = null;

/**
 * Load MediaPipe Face Landmarker model
 * Model is cached after first load
 */
export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
	if (faceLandmarker) {
		return faceLandmarker;
	}

	// Return existing promise if loading is in progress
	if (loadingPromise) {
		return loadingPromise;
	}

	loadingPromise = (async () => {
		try {
			const base = import.meta.env.BASE_URL;
			const vision = await FilesetResolver.forVisionTasks(
				`${base}mediapipe/wasm`
			);

			const landmarker = await FaceLandmarker.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath: `${base}mediapipe/face_landmarker.task`,
					delegate: "GPU",
				},
				runningMode: "VIDEO",
				numFaces: 1,
				outputFaceBlendshapes: true,
				outputFacialTransformationMatrixes: true,
			});

			faceLandmarker = landmarker;
			console.log("MediaPipe Face Landmarker loaded successfully");
			return landmarker;
		} catch (error) {
			console.error("Failed to load MediaPipe Face Landmarker:", error);
			loadingPromise = null;
			throw error;
		}
	})();

	return loadingPromise;
}

export function getFaceLandmarker(): FaceLandmarker | null {
	return faceLandmarker;
}
