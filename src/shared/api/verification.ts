import type { ApiError, VerificationResponse, BackendVerificationResponse } from "./types";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const API_KEY = import.meta.env.VITE_API_KEY || "";

/**
 * Convert base64 data URL to Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
	const arr = dataURL.split(",");
	const mimeMatch = arr[0].match(/:(.*?);/);
	const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], { type: mime });
}

/**
 * Verify two images by comparing them
 * @param sourceImage - First image as base64 data URL
 * @param targetImage - Second image as base64 data URL
 * @returns Verification result with match status and confidence
 * @throws ApiError if the request fails
 */
export async function verifyImages(
	sourceImage: string,
	targetImage: string,
): Promise<VerificationResponse> {
	try {
		// Convert base64 to Blobs
		const sourceBlob = dataURLtoBlob(sourceImage);
		const targetBlob = dataURLtoBlob(targetImage);

		// Create FormData
		const formData = new FormData();
		formData.append("source_image", sourceBlob, "source.jpg");
		formData.append("target_image", targetBlob, "target.jpg");

		// Prepare headers
		const headers: HeadersInit = {};
		if (API_KEY) {
			headers["x-api-key"] = API_KEY;
		}

		// Make API request
		const response = await fetch(`${API_BASE_URL}/verification/verify`, {
			method: "POST",
			headers,
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({
				message: "Unknown error occurred",
			}));
			throw {
				message: errorData.message || `HTTP error! status: ${response.status}`,
				status: response.status,
			} satisfies ApiError;
		}

		const data = await response.json() as BackendVerificationResponse;

		// Parse the backend response
		// Check if we have results with face matches
		const hasResults = data.result && data.result.length > 0;
		const firstResult = hasResults ? data.result[0] : null;
		const hasFaceMatches = firstResult?.face_matches && firstResult.face_matches.length > 0;

		// Determine if it's a match based on similarity threshold (e.g., > 0.7 = 70%)
		const SIMILARITY_THRESHOLD = 0.7;
		const isMatch = Boolean(hasFaceMatches && firstResult.face_matches[0].similarity >= SIMILARITY_THRESHOLD);

		// Get the highest similarity as confidence (convert to percentage)
		const confidence = hasFaceMatches
			? Math.round(firstResult.face_matches[0].similarity * 100)
			: 0;

		return {
			isMatch,
			confidence,
		};
	} catch (error) {
		if ((error as ApiError).status) {
			throw error;
		}

		// Network or other errors
		throw {
			message:
				error instanceof Error ? error.message : "Network error occurred",
			status: 0,
		} satisfies ApiError;
	}
}
