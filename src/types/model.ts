// AI 모델 목록 조회 API 타입 정의

// AI 모델 정보 (목록 조회)
export interface AIModel {
  modelId: number; // 모델 ID
  modelName: string; // 내부 모델 식별자 (예: gpt-4)
  displayName: string; // 사용자 표시 이름 (예: GPT-4)
  displayExplain: string; // 모델 설명
  inputPricePer1m: number; // 입력 1m 토큰당 가격
  outputPricePer1m: number; // 출력 1m 토큰당 가격
  averagePricePer1k?: number; // 평균 가격 (선택적)
  isActive: boolean; // 활성화 여부
  createdAt: string; // 생성 시각 (ISO 8601)
}

// AI 모델 상세 정보
export interface AIModelDetail {
  modelId: number; // 모델 ID
  modelName: string; // 내부 모델 식별자 (예: gpt-4)
  displayName: string; // 사용자 표시 이름 (예: GPT-4)
  displayExplain: string; // 모델 설명
  inputPricePer1m: number; // 입력 1m 토큰당 가격
  outputPricePer1m: number; // 출력 1m 토큰당 가격
  isActive: boolean; // 활성화 여부
  createdAt: string; // 생성 시각 (ISO 8601)
  updatedAt: string; // 수정 시각 (ISO 8601)
}

// [관리자] AI 모델 등록 요청
export interface CreateModelRequest {
  modelName: string; // 시스템 내부 모델 식별자 (필수, 소문자, 하이픈 허용)
  displayName: string; // 프런트 표시 이름 (필수, 최대 30자)
  displayExplain?: string; // 모델 설명 (선택, 최대 200자)
  inputPricePer1m: number; // 입력 1m 토큰당 USD 가격 (필수, 0 이상)
  outputPricePer1m: number; // 출력 1m 토큰당 USD 가격 (필수, 0 이상)
  isActive: boolean; // 활성화 여부 (필수)
}

// [관리자] AI 모델 수정 요청
export interface UpdateModelRequest {
  displayName?: string; // 사용자 표시 이름 (선택, 최대 30자)
  displayExplain?: string; // 모델 설명 (선택, 최대 200자)
  inputPricePer1m?: number; // 입력 1m 토큰당 USD 가격 (선택, 0 이상)
  outputPricePer1m?: number; // 출력 1m 토큰당 USD 가격 (선택, 0 이상)
  isActive?: boolean; // 활성화 여부 (선택)
}
