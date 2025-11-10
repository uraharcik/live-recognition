export interface VerificationRequest {
  source_image: File | Blob;
  target_image: File | Blob;
}

export interface FaceBox {
  probability: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface FaceMatch {
  box: FaceBox;
  similarity: number;
}

export interface BackendVerificationResponse {
  result: Array<{
    source_image_face: {
      box: FaceBox;
    };
    face_matches: FaceMatch[];
  }>;
}

export interface VerificationResponse {
  isMatch: boolean;
  confidence: number;
}

export interface ApiError {
  message: string;
  status: number;
}