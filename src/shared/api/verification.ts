import type {
	ApiError,
	CompareApiResponse,
	CompareRequestMetrics,
	VerificationResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

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

function pickConfidence(data: CompareApiResponse): number {
	const raw =
		data.confidence ??
		data.Confidence ??
		data.similarity ??
		data.Similarity ??
		0;
	return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

export async function verifyImages(
	sourceImage: string,
	targetImage: string,
	metrics: CompareRequestMetrics,
): Promise<VerificationResponse> {
	try {
		const sourceBlob = dataURLtoBlob(sourceImage);
		const targetBlob = dataURLtoBlob(targetImage);

		const formData = new FormData();
		formData.append("IsLive", String(metrics.isLive));
		formData.append("EyesOpenOk", String(metrics.eyesOpenOk));
		formData.append("HeadRotationOk", String(metrics.headRotationOk));
		formData.append("YawAngle", String(metrics.yawAngle));
		formData.append("SourceImage", sourceBlob, "source.jpg");
		formData.append("TargetImage", targetBlob, "target.jpg");

		const headers: HeadersInit = {};
		if (API_KEY) {
			headers["x-api-key"] = API_KEY;
		}

		const response = await fetch(`${API_BASE_URL}/Verification/compare`, {
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

		const data = (await response.json()) as CompareApiResponse;
		const isMatch = Boolean(data.isMatch ?? data.IsMatch);
		const confidence = pickConfidence(data);

		return { isMatch, confidence };
	} catch (error) {
		if ((error as ApiError).status !== undefined) {
			throw error;
		}

		throw {
			message:
				error instanceof Error ? error.message : "Network error occurred",
			status: 0,
		} satisfies ApiError;
	}
}