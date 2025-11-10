export interface VerificationRequest {
  source_image: File | Blob;
  target_image: File | Blob;
}

export interface VerificationResponse {
  isMatch: boolean;
  confidence: number;
}

export interface ApiError {
  message: string;
  status: number;
}