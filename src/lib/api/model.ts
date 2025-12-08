import {
  AIModel,
  AIModelDetail,
  CreateModelRequest,
  UpdateModelRequest,
} from "@/types/model";
import { ApiErrorDetail, ApiResponse } from "@/types/upload";

// API 베이스 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * 활성화된 AI 모델 목록 조회
 * Public API (인증 불필요)
 */
export async function getModels(): Promise<ApiResponse<AIModel[]>> {
  try {

    const response = await fetch(`${API_BASE_URL}/api/v1/models`, {
      method: "GET",
      credentials: "include", // 쿠키 포함 (선택적)
      headers: {
        "Content-Type": "application/json",
      },
    });


    const data: ApiResponse<AIModel[]> | ApiResponse<ApiErrorDetail> =
      await response.json();


    // 성공 응답 (200 OK)
    if (response.ok && data.success) {
      return data as ApiResponse<AIModel[]>;
    }

    // 에러 응답
    const errorDetail = data.detail as ApiErrorDetail;

    // 특정 에러 코드별 처리
    switch (errorDetail.code) {
      case "SYSTEM_ILLEGAL_STATE":
        throw new Error(
          errorDetail.message || "모델 정보를 가져올 수 없습니다."
        );
      default:
        throw new Error(
          errorDetail.message || "모델 목록 조회에 실패했습니다."
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("모델 목록 조회 중 오류가 발생했습니다.");
  }
}

/**
 * 특정 AI 모델의 상세 정보 조회
 * Public API (인증 불필요)
 */
export async function getModelDetail(
  modelId: number
): Promise<ApiResponse<AIModelDetail>> {
  // 유효성 검사
  if (!modelId || modelId <= 0) {
    throw new Error("유효한 모델 ID가 필요합니다.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/models/${modelId}`, {
      method: "GET",
      credentials: "include", // 쿠키 포함 (선택적)
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: ApiResponse<AIModelDetail> | ApiResponse<ApiErrorDetail> =
      await response.json();

    // 성공 응답 (200 OK)
    if (response.ok && data.success) {
      return data as ApiResponse<AIModelDetail>;
    }

    // 에러 응답
    const errorDetail = data.detail as ApiErrorDetail;

    // 특정 에러 코드별 처리
    switch (errorDetail.code) {
      case "MODEL_NOT_FOUND":
        throw new Error("요청한 모델을 찾을 수 없습니다.");
      case "SYSTEM_ILLEGAL_STATE":
        throw new Error(
          errorDetail.message || "모델 정보를 가져올 수 없습니다."
        );
      default:
        throw new Error(
          errorDetail.message || "모델 조회에 실패했습니다."
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("모델 조회 중 오류가 발생했습니다.");
  }
}

/**
 * [관리자] 새로운 AI 모델 등록
 * 쿠키 기반 인증 사용 (관리자 권한 필요)
 */
export async function createModel(
  request: CreateModelRequest
): Promise<ApiResponse<AIModelDetail>> {
  const {
    modelName,
    displayName,
    displayExplain,
    inputPricePer1k,
    outputPricePer1k,
    isActive,
  } = request;

  // 유효성 검사
  if (!modelName || modelName.trim().length === 0) {
    throw new Error("모델 식별자를 입력해주세요.");
  }

  if (!displayName || displayName.trim().length === 0) {
    throw new Error("모델 표시 이름을 입력해주세요.");
  }

  if (displayName.length > 30) {
    throw new Error("모델 표시 이름은 최대 30자까지 입력 가능합니다.");
  }

  if (displayExplain && displayExplain.length > 200) {
    throw new Error("모델 설명은 최대 200자까지 입력 가능합니다.");
  }

  if (inputPricePer1k < 0) {
    throw new Error("입력 토큰 가격은 0 이상이어야 합니다.");
  }

  if (outputPricePer1k < 0) {
    throw new Error("출력 토큰 가격은 0 이상이어야 합니다.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/models`, {
      method: "POST",
      credentials: "include", // 쿠키 포함
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelName,
        displayName,
        displayExplain,
        inputPricePer1m: inputPricePer1k,
        outputPricePer1m: outputPricePer1k,
        isActive,
      }),
    });

    const data: ApiResponse<AIModelDetail> | ApiResponse<ApiErrorDetail> =
      await response.json();

    // 성공 응답 (201 Created)
    if (response.ok && data.success) {
      return data as ApiResponse<AIModelDetail>;
    }

    // 에러 응답
    const errorDetail = data.detail as ApiErrorDetail;

    // 특정 에러 코드별 처리
    switch (errorDetail.code) {
      case "INVALID_TOKEN":
        throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
      case "FORBIDDEN":
        throw new Error("관리자 권한이 필요합니다.");
      case "VALIDATION_ERROR":
        throw new Error(
          errorDetail.message || "입력값을 확인해주세요."
        );
      default:
        throw new Error(
          errorDetail.message || "모델 등록에 실패했습니다."
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("모델 등록 중 오류가 발생했습니다.");
  }
}

/**
 * [관리자] AI 모델 정보 수정
 * 쿠키 기반 인증 사용 (관리자 권한 필요)
 */
export async function updateModel(
  modelId: number,
  request: UpdateModelRequest
): Promise<ApiResponse<AIModelDetail>> {
  const { displayName, displayExplain, inputPricePer1k, outputPricePer1k, isActive } =
    request;

  // 유효성 검사
  if (!modelId || modelId <= 0) {
    throw new Error("유효한 모델 ID가 필요합니다.");
  }

  if (displayName !== undefined && displayName.trim().length === 0) {
    throw new Error("모델 표시 이름을 입력해주세요.");
  }

  if (displayName !== undefined && displayName.length > 30) {
    throw new Error("모델 표시 이름은 최대 30자까지 입력 가능합니다.");
  }

  if (displayExplain !== undefined && displayExplain.length > 200) {
    throw new Error("모델 설명은 최대 200자까지 입력 가능합니다.");
  }

  if (inputPricePer1k !== undefined && inputPricePer1k < 0) {
    throw new Error("입력 토큰 가격은 0 이상이어야 합니다.");
  }

  if (outputPricePer1k !== undefined && outputPricePer1k < 0) {
    throw new Error("출력 토큰 가격은 0 이상이어야 합니다.");
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/models/${modelId}`,
      {
        method: "PUT",
        credentials: "include", // 쿠키 포함
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          displayExplain,
          inputPricePer1k,
          outputPricePer1k,
          isActive,
        }),
      }
    );

    const data: ApiResponse<AIModelDetail> | ApiResponse<ApiErrorDetail> =
      await response.json();

    // 성공 응답 (200 OK)
    if (response.ok && data.success) {
      return data as ApiResponse<AIModelDetail>;
    }

    // 에러 응답
    const errorDetail = data.detail as ApiErrorDetail;

    // 특정 에러 코드별 처리
    switch (errorDetail.code) {
      case "INVALID_TOKEN":
        throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
      case "FORBIDDEN":
        throw new Error("관리자 권한이 필요합니다.");
      case "MODEL_NOT_FOUND":
        throw new Error("요청한 모델을 찾을 수 없습니다.");
      case "VALIDATION_ERROR":
        throw new Error(
          errorDetail.message || "입력값을 확인해주세요."
        );
      default:
        throw new Error(
          errorDetail.message || "모델 수정에 실패했습니다."
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("모델 수정 중 오류가 발생했습니다.");
  }
}

/**
 * [관리자] AI 모델 삭제
 * 쿠키 기반 인증 사용 (관리자 권한 필요)
 */
export async function deleteModel(modelId: number): Promise<void> {
  // 유효성 검사
  if (!modelId || modelId <= 0) {
    throw new Error("유효한 모델 ID가 필요합니다.");
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/models/${modelId}`,
      {
        method: "DELETE",
        credentials: "include", // 쿠키 포함
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // 성공 응답 (204 No Content)
    if (response.status === 204) {
      return;
    }

    // 에러 응답 처리
    const data: ApiResponse<ApiErrorDetail> = await response.json();
    const errorDetail = data.detail as ApiErrorDetail;

    // 특정 에러 코드별 처리
    switch (errorDetail.code) {
      case "INVALID_TOKEN":
        throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
      case "FORBIDDEN":
        throw new Error("관리자 권한이 필요합니다.");
      case "MODEL_NOT_FOUND":
        throw new Error("요청한 모델을 찾을 수 없습니다.");
      case "CONFLICT":
        throw new Error("활성 채팅방에서 사용 중인 모델은 삭제할 수 없습니다.");
      default:
        throw new Error(
          errorDetail.message || "모델 삭제에 실패했습니다."
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("모델 삭제 중 오류가 발생했습니다.");
  }
}
