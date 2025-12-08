# AI Hub FE - API 연동 가이드

## 프로젝트 개요

Next.js 16.0.1 기반의 AI 채팅 허브 프론트엔드 프로젝트입니다.

## 인증 방식

**중요: Bearer 토큰이 아닌 쿠키 기반 인증을 사용합니다.**

- API 문서에 Bearer 토큰으로 명시되어 있어도 실제로는 쿠키만 사용
- 모든 fetch 요청에 `credentials: 'include'` 필수

## 환경 변수

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

## 프로젝트 구조

```
src/
├── types/              # TypeScript 타입 정의
│   ├── chat.ts         # 채팅 UI 관련 타입 (Message, AIModel 등)
│   ├── upload.ts       # 파일 업로드 타입 (ApiResponse, UploadFileResponse 등)
│   └── message.ts      # 메시지 API 타입 (ApiMessage, SendMessageRequest, SSE 등)
│
├── lib/api/            # API 클라이언트 함수
│   ├── upload.ts       # 파일 업로드 API
│   └── message.ts      # 메시지 관련 API (조회, 전송, 상세)
│
├── hooks/              # React 커스텀 훅
│   ├── useChat.ts          # 기존 채팅 훅 (더미)
│   ├── useChatWithAPI.ts   # 실제 API 사용하는 채팅 훅
│   ├── useFileUpload.ts    # 파일 업로드 훅
│   ├── useMessages.ts      # 메시지 목록 조회 훅
│   └── useMessageDetail.ts # 메시지 상세 조회 훅
│
├── app/                # Next.js App Router
└── components/         # React 컴포넌트
```

## API 연동 패턴

### 1. 타입 정의 (src/types/)

먼저 API 응답/요청 타입을 정의합니다.

```typescript
// src/types/[feature].ts

// 공통 API 응답 타입 (upload.ts에 정의됨)
export interface ApiResponse<T> {
  success: boolean;
  detail: T;
  timestamp: string;
}

// 공통 에러 타입 (upload.ts에 정의됨)
export interface ApiErrorDetail {
  code: string;
  message: string;
  details: string | null;
}

// 기능별 타입
export interface YourFeatureResponse {
  // API 문서의 detail 내부 필드
}
```

### 2. API 클라이언트 (src/lib/api/)

쿠키 기반 인증을 사용하는 API 함수를 작성합니다.

```typescript
// src/lib/api/[feature].ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function yourApiFunction(params: Params): Promise<Response> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/your-endpoint`, {
      method: "GET", // or POST, PUT, DELETE
      credentials: "include", // ⭐ 쿠키 인증 필수
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData), // POST/PUT인 경우
    });

    const data: ApiResponse<YourData> | ApiResponse<ApiErrorDetail> =
      await response.json();

    // 성공 응답
    if (response.ok && data.success) {
      return data as ApiResponse<YourData>;
    }

    // 에러 응답 처리
    const errorDetail = data.detail as ApiErrorDetail;
    switch (errorDetail.code) {
      case "SPECIFIC_ERROR_CODE":
        throw new Error("명확한 에러 메시지");
      default:
        throw new Error(errorDetail.message || "기본 에러 메시지");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("작업 중 오류가 발생했습니다.");
  }
}
```

### 3. React 훅 (src/hooks/)

API 클라이언트를 사용하는 커스텀 훅을 작성합니다.

```typescript
// src/hooks/useYourFeature.ts

import { useState, useCallback, useEffect } from "react";
import { yourApiFunction } from "@/lib/api/yourFeature";

interface UseYourFeatureOptions {
  autoFetch?: boolean;
  onError?: (error: Error) => void;
}

export function useYourFeature(options: UseYourFeatureOptions) {
  const { autoFetch = true, onError } = options;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await yourApiFunction();
      setData(response.detail);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("조회 실패");
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return { data, isLoading, error, fetch };
}
```

## 구현된 API 목록

### 1. 채팅방 목록 조회

- **엔드포인트**: `GET /api/v1/chat-rooms`
- **타입**: `src/types/room.ts`
- **API**: `src/lib/api/room.ts` - `getChatRooms()`
- **훅**: `src/hooks/useRooms.ts`
  - `useRooms()`: 일반 페이지네이션
  - `useInfiniteRooms()`: 무한 스크롤
- **쿼리 파라미터**:
  - `page` (기본값: 0)
  - `size` (기본값: 20, 1~100)
  - `sort` (기본값: "createdAt,desc")
- **응답 필드**:
  - roomId, title, coinUsage
  - lastMessageAt, createdAt

### 2. 채팅방 생성

- **엔드포인트**: `POST /api/v1/chat-rooms`
- **타입**: `src/types/room.ts` - `CreateChatRoomRequest`, `CreateChatRoomResponse`
- **API**: `src/lib/api/room.ts` - `createChatRoom()`
- **훅**: `src/hooks/useRooms.ts`
  - `useRooms().createRoom()`: 일반 페이지네이션용
  - `useInfiniteRooms().createRoom()`: 무한 스크롤용
- **요청 필드**:
  - `title` (필수, 최대 30자, 공백만 입력 불가)
  - `modelId` (필수, 활성 상태의 모델만 허용)
- **응답 필드**:
  - roomId, title, userId
  - coinUsage, createdAt, updatedAt
- **특징**:
  - 생성 후 자동으로 목록 새로고침
  - 유효성 검사 포함

### 2-1. 채팅방 상세 조회

- **엔드포인트**: `GET /api/v1/chat-rooms/{roomId}`
- **타입**: `src/types/room.ts` - `RoomDetail`
- **API**: `src/lib/api/room.ts` - `getRoomDetail()`
- **훅**: `src/hooks/useRoomDetail.ts` - `useRoomDetail()`
- **경로 변수**:
  - `roomId` (UUID)
- **응답 필드**:
  - roomId, title, userId
  - coinUsage, createdAt, updatedAt
- **특징**:
  - autoFetch 옵션 지원
  - 에러 콜백 지원

### 2-2. 채팅방 삭제

- **엔드포인트**: `DELETE /api/v1/chat-rooms/{roomId}`
- **API**: `src/lib/api/room.ts` - `deleteChatRoom()`
- **훅**: `src/hooks/useRooms.ts`
  - `useRooms().deleteRoom()`: 일반 페이지네이션용
  - `useInfiniteRooms().deleteRoom()`: 무한 스크롤용
- **경로 변수**:
  - `roomId` (UUID)
- **응답**: 204 No Content
- **특징**:
  - 연관 메시지도 함께 삭제
  - 삭제 후 자동으로 목록 새로고침

### 2-3. 채팅방 제목 수정

- **엔드포인트**: `PUT /api/v1/chat-rooms/{roomId}`
- **타입**: `src/types/room.ts` - `UpdateChatRoomRequest`, `RoomDetail`
- **API**: `src/lib/api/room.ts` - `updateChatRoom()`
- **훅**: `src/hooks/useRoomDetail.ts` - `useRoomDetail().updateTitle()`
- **UI 구현**: `src/components/chat/Sidebar.tsx`
- **경로 변수**:
  - `roomId` (UUID)
- **요청 필드**:
  - `title` (필수, 최대 30자)
- **응답 필드**:
  - roomId, title, userId
  - coinUsage, createdAt, updatedAt
- **특징**:
  - 수정 후 자동으로 상태 업데이트
  - 유효성 검사 포함
- **UI 기능**:
  - 채팅방 목록에서 호버 시 연필 아이콘 편집 버튼 표시
  - 편집 버튼 클릭 시 인라인 편집 모드로 전환
  - 입력 필드에서 Enter 키로 저장, Escape 키로 취소
  - 저장(✓) 및 취소(✕) 버튼 제공
  - 최대 30자 제한 및 빈 제목 방지
  - 수정 성공 시 자동 목록 새로고침

### 3. AI 모델 목록 조회

- **엔드포인트**: `GET /api/v1/models`
- **타입**: `src/types/model.ts` - `AIModel`
- **API**: `src/lib/api/model.ts` - `getModels()`
- **훅**: `src/hooks/useModels.ts` - `useModels()`
- **인증**: Public (인증 불필요)
- **응답 필드**:
  - modelId, modelName, displayName, displayExplain
  - inputPricePer1k, outputPricePer1k, averagePricePer1k
  - isActive, createdAt
- **특징**:
  - Public API로 인증 없이 사용 가능
  - 활성화된 모델만 반환됨
  - `activeModels` 필터링 제공
  - `getModelById()` 헬퍼 함수 제공

### 3-1. AI 모델 상세 조회

- **엔드포인트**: `GET /api/v1/models/{modelId}`
- **타입**: `src/types/model.ts` - `AIModelDetail`
- **API**: `src/lib/api/model.ts` - `getModelDetail()`
- **훅**: `src/hooks/useModelDetail.ts` - `useModelDetail()`
- **인증**: Public (인증 불필요)
- **경로 변수**:
  - `modelId` (integer)
- **응답 필드**:
  - modelId, modelName, displayName, displayExplain
  - inputPricePer1k, outputPricePer1k
  - isActive, createdAt, updatedAt
- **특징**:
  - Public API로 인증 없이 사용 가능
  - autoFetch 옵션 지원
  - 에러 콜백 지원

### 3-2. [관리자] AI 모델 등록

- **엔드포인트**: `POST /api/v1/admin/models`
- **타입**: `src/types/model.ts` - `CreateModelRequest`, `AIModelDetail`
- **API**: `src/lib/api/model.ts` - `createModel()`
- **훅**: `src/hooks/useModels.ts` - `useModels().createNewModel()`
- **인증**: 관리자 권한 (쿠키 기반)
- **요청 필드**:
  - `modelName` (필수, 소문자, 하이픈 허용)
  - `displayName` (필수, 최대 30자)
  - `displayExplain` (선택, 최대 200자)
  - `inputPricePer1k` (필수, 0 이상)
  - `outputPricePer1k` (필수, 0 이상)
  - `isActive` (필수)
- **응답 필드**:
  - modelId, modelName, displayName, displayExplain
  - inputPricePer1k, outputPricePer1k
  - isActive, createdAt, updatedAt
- **특징**:
  - 관리자 권한 필수
  - 등록 후 자동으로 목록 새로고침
  - 유효성 검사 포함

### 3-3. [관리자] AI 모델 수정

- **엔드포인트**: `PUT /api/v1/admin/models/{modelId}`
- **타입**: `src/types/model.ts` - `UpdateModelRequest`, `AIModelDetail`
- **API**: `src/lib/api/model.ts` - `updateModel()`
- **훅**: `src/hooks/useModelDetail.ts` - `useModelDetail().updateModelInfo()`
- **인증**: 관리자 권한 (쿠키 기반)
- **경로 변수**:
  - `modelId` (integer)
- **요청 필드** (모두 선택):
  - `displayName` (선택, 최대 30자)
  - `displayExplain` (선택, 최대 200자)
  - `inputPricePer1k` (선택, 0 이상)
  - `outputPricePer1k` (선택, 0 이상)
  - `isActive` (선택)
- **응답 필드**:
  - modelId, modelName, displayName, displayExplain
  - inputPricePer1k, outputPricePer1k
  - isActive, createdAt, updatedAt
- **특징**:
  - 관리자 권한 필수
  - 수정 후 자동으로 상태 업데이트
  - 유효성 검사 포함
  - 모든 필드 선택적 (부분 수정 가능)

### 3-4. [관리자] AI 모델 삭제

- **엔드포인트**: `DELETE /api/v1/admin/models/{modelId}`
- **API**: `src/lib/api/model.ts` - `deleteModel()`
- **훅**: `src/hooks/useModels.ts` - `useModels().deleteModelById()`
- **인증**: 관리자 권한 (쿠키 기반)
- **경로 변수**:
  - `modelId` (integer)
- **응답**: 204 No Content
- **특징**:
  - 관리자 권한 필수
  - 삭제 후 자동으로 목록 새로고침
  - 활성 채팅방에서 사용 중인 모델은 삭제 불가 (409 Conflict)

### 4. 파일 업로드

- **엔드포인트**: `POST /api/v1/messages/files/upload`
- **타입**: `src/types/upload.ts`
- **API**: `src/lib/api/upload.ts` - `uploadFile()`
- **훅**: `src/hooks/useFileUpload.ts` - `useFileUpload()`
- **특징**:
  - FormData 사용
  - 50MB 제한
  - 이미지/문서만 허용
  - 파일 유효성 검사 포함

### 5. 사용자 통계 요약

- **엔드포인트**: `GET /api/v1/dashboard/stats`
- **타입**: `src/types/dashboard.ts` - `DashboardStats`, `MostUsedModel`
- **API**: `src/lib/api/dashboard.ts` - `getDashboardStats()`
- **훅**: `src/hooks/useDashboardStats.ts` - `useDashboardStats()`
- **인증**: 필수 (쿠키 기반)
- **응답 필드**:
  - totalCoinPurchased, totalCoinUsed, currentBalance
  - totalMessages, totalChatRooms
  - mostUsedModel (modelId, modelName, displayName, usagePercentage)
  - last30DaysUsage, memberSince
- **특징**:
  - 사용자별 통계 정보 제공
  - autoFetch 옵션 지원
  - 에러 콜백 지원

### 5-1. 모델별 가격 대시보드

- **엔드포인트**: `GET /api/v1/dashboard/models/pricing`
- **타입**: `src/types/dashboard.ts` - `ModelPricing`
- **API**: `src/lib/api/dashboard.ts` - `getModelsPricing()`
- **훅**: `src/hooks/useModelsPricing.ts` - `useModelsPricing()`
- **인증**: Public (인증 불필요)
- **응답 필드**:
  - modelId, modelName, displayName
  - inputPricePer1k, inputPricePer1m, outputPricePer1m
  - isActive
- **특징**:
  - Public API로 인증 없이 사용 가능
  - 활성화된 모델만 반환됨
  - autoFetch 옵션 지원
  - getModelById() 헬퍼 함수 제공

### 5-2. 월별 모델별 코인 사용량

- **엔드포인트**: `GET /api/v1/dashboard/usage/monthly`
- **타입**: `src/types/dashboard.ts` - `MonthlyUsage`, `ModelUsage`, `DailyUsage`
- **API**: `src/lib/api/dashboard.ts` - `getMonthlyUsage()`
- **훅**: `src/hooks/useMonthlyUsage.ts` - `useMonthlyUsage()`
- **인증**: 필수 (쿠키 기반)
- **쿼리 파라미터**:
  - `year` (선택, 기본값: 현재 연도)
  - `month` (선택, 기본값: 현재 월, 1-12)
- **응답 필드**:
  - year, month, totalCoinUsed
  - modelUsage[] (modelId, modelName, displayName, coinUsed, messageCount, tokenCount, percentage)
  - dailyUsage[] (date, coinUsed, messageCount)
- **특징**:
  - 사용자별 월별 통계 제공
  - 모델별/일별 사용량 상세 정보
  - 동적 년/월 조회 가능 (fetchUsage(year, month))
  - autoFetch 옵션 지원

### 5-3. 내 정보 조회

- **엔드포인트**: `GET /api/v1/users/me`
- **타입**: `src/types/user.ts` - `UserInfo`
- **API**: `src/lib/api/user.ts` - `getCurrentUser()`
- **훅**: `src/hooks/useCurrentUser.ts` - `useCurrentUser()`
- **UI 구현**: `src/components/chat/UserInfoDialog.tsx`, `src/components/chat/SettingsMenu.tsx`
- **인증**: 필수 (쿠키 기반)
- **응답 필드**:
  - userId, username, email
  - isActivated, createdAt
- **특징**:
  - 현재 로그인한 사용자 정보 제공
  - autoFetch 옵션 지원
  - 에러 콜백 지원
- **UI 기능**:
  - 환경 설정 메뉴에서 "내 정보 조회" 버튼 클릭 시 모달 표시
  - 사용자 ID, 이름, 이메일, 계정 상태, 가입일 표시
  - 정보 수정 및 회원 탈퇴 기능 제공
  - 편집 모드에서 사용자 이름과 이메일 수정 가능

### 5-4. 회원 탈퇴

- **엔드포인트**: `DELETE /api/v1/users/me`
- **API**: `src/lib/api/user.ts` - `deleteCurrentUser()`
- **훅**: `src/hooks/useCurrentUser.ts` - `useCurrentUser().deleteUser()`
- **UI 구현**: `src/components/chat/UserInfoDialog.tsx`
- **인증**: 필수 (쿠키 기반)
- **응답**: 204 No Content
- **특징**:
  - 소프트 삭제 처리
  - 탈퇴 후 사용자 정보 자동 초기화
  - 에러 발생 시 throw
- **UI 기능**:
  - 내 정보 조회 모달에서 "회원 탈퇴" 버튼 제공
  - 탈퇴 시 확인 다이얼로그 표시
  - 탈퇴 성공 시 로그인 페이지로 자동 이동

### 5-5. 내 정보 수정

- **엔드포인트**: `PUT /api/v1/users/me`
- **타입**: `src/types/user.ts` - `UpdateUserRequest`, `UserInfo`
- **API**: `src/lib/api/user.ts` - `updateCurrentUser()`
- **훅**: `src/hooks/useCurrentUser.ts` - `useCurrentUser().updateUser()`
- **UI 구현**: `src/components/chat/UserInfoDialog.tsx`
- **인증**: 필수 (쿠키 기반)
- **요청 필드**:
  - `username` (필수, 2~30자, 공백 불가)
  - `email` (필수, RFC 5322 형식)
- **응답 필드**:
  - userId, username, email
  - isActivated, createdAt
- **특징**:
  - 수정 후 자동으로 사용자 정보 업데이트
  - 유효성 검사 포함 (길이, 공백, 이메일 형식)
  - 에러 발생 시 throw
- **UI 기능**:
  - 내 정보 조회 모달에서 "정보 수정" 버튼 클릭 시 편집 모드로 전환
  - 편집 모드에서 사용자 이름과 이메일 입력 필드 활성화
  - "저장" 버튼으로 수정 내용 저장, "취소" 버튼으로 편집 취소
  - 저장 성공 시 자동으로 화면 업데이트
  - 유효성 검사 실패 시 에러 메시지 표시

### 5-6. 결제 내역 조회

- **엔드포인트**: `GET /api/v1/payments`
- **타입**: `src/types/payment.ts` - `Payment`, `PaymentsPageResponse`, `PaymentStatus`
- **API**: `src/lib/api/payment.ts` - `getPayments()`
- **훅**: `src/hooks/usePayments.ts` - `usePayments()`
- **인증**: 필수 (쿠키 기반)
- **쿼리 파라미터**:
  - `page` (기본값: 0)
  - `size` (기본값: 20, 1~100)
  - `status` (선택: pending, completed, failed, cancelled)
- **응답 필드**:
  - content[] (paymentId, transactionId, paymentMethod, amountKrw, coinAmount, bonusCoin, status, createdAt, completedAt)
  - totalElements, totalPages, size, number
- **특징**:
  - 페이지네이션 지원
  - 결제 상태별 필터링 가능
  - 동적 페이지/상태 조회 가능 (fetchPayments(page, status))
  - autoFetch 옵션 지원

### 5-7. 결제 상세 조회

- **엔드포인트**: `GET /api/v1/payments/{paymentId}`
- **타입**: `src/types/payment.ts` - `PaymentDetail`
- **API**: `src/lib/api/payment.ts` - `getPaymentDetail()`
- **훅**: `src/hooks/usePaymentDetail.ts` - `usePaymentDetail()`
- **인증**: 필수 (쿠키 기반)
- **경로 변수**:
  - `paymentId` (number)
- **응답 필드**:
  - paymentId, transactionId, paymentMethod
  - amountKrw, amountUsd, coinAmount, bonusCoin
  - status, paymentGateway, metadata
  - createdAt, completedAt
- **특징**:
  - 결제 상세 정보 제공 (목록 조회보다 상세)
  - metadata(JSONB) 포함
  - autoFetch 옵션 지원
  - 에러 콜백 지원

### 5-8. 코인 충전 요청

- **엔드포인트**: `POST /api/v1/payments`
- **타입**: `src/types/payment.ts` - `CreatePaymentRequest`, `CreatePaymentResponse`
- **API**: `src/lib/api/payment.ts` - `createPayment()`
- **훅**: `src/hooks/usePayments.ts` - `usePayments().createNewPayment()`
- **인증**: 필수 (쿠키 기반)
- **요청 필드**:
  - `amountKrw` (필수, 1,000 이상)
  - `paymentMethod` (필수, 예: card, transfer)
  - `paymentGateway` (필수, 예: toss)
- **응답 필드**:
  - paymentId, transactionId
  - amountKrw, amountUsd
  - coinAmount, bonusCoin
  - status, paymentUrl, createdAt
- **특징**:
  - 결제 게이트웨이에 충전 요청 생성
  - 유효성 검사 포함 (금액, 결제 수단, 게이트웨이)
  - 충전 후 자동으로 결제 내역 새로고침
  - paymentUrl로 리다이렉트하여 실제 결제 진행
  - 에러 발생 시 throw (CONFLICT: 이미 처리 중인 결제 존재)

### 5-9. 결제 취소

- **엔드포인트**: `POST /api/v1/payments/{paymentId}/cancel`
- **타입**: `src/types/payment.ts` - `CancelPaymentRequest`, `CancelPaymentResponse`
- **API**: `src/lib/api/payment.ts` - `cancelPayment()`
- **훅**: `src/hooks/usePaymentDetail.ts` - `usePaymentDetail().cancelPaymentRequest()`
- **인증**: 필수 (쿠키 기반)
- **경로 변수**:
  - `paymentId` (number)
- **요청 필드**:
  - `reason` (필수, 취소 사유)
- **응답 필드**:
  - paymentId, transactionId
  - status (cancelled)
  - refundedAmount, refundedCoin
  - reason, cancelledAt
- **특징**:
  - 결제 취소 및 환불 처리
  - 유효성 검사 포함 (취소 사유 필수)
  - 취소 후 자동으로 결제 상세 정보 새로고침
  - 에러 발생 시 throw (PAYMENT_NOT_FOUND: 결제 내역 없음)

### 5-10. 로그아웃

- **엔드포인트**: `POST /api/v1/auth/logout`
- **타입**: `src/types/auth.ts` - `LogoutRequest`
- **API**: `src/lib/api/auth.ts` - `logout()`
- **훅**: `src/hooks/useLogout.ts` - `useLogout()`
- **인증**: 필수 (쿠키 기반)
- **요청 필드**:
  - `refreshToken` (필수, 폐기할 리프레시 토큰)
- **응답**: 204 No Content
- **특징**:
  - 액세스 토큰과 리프레시 토큰 폐기
  - 유효성 검사 포함 (리프레시 토큰 필수)
  - onSuccess, onError 콜백 지원
  - 에러 발생 시 throw (VALIDATION_ERROR, INVALID_TOKEN)

### 5-11. 토큰 갱신

- **엔드포인트**: `POST /api/v1/token/refresh`
- **타입**: `src/types/auth.ts` - `TokenRefreshResponse`
- **API**: `src/lib/api/auth.ts` - `refreshToken()`
- **훅**: `src/hooks/useTokenRefresh.ts` - `useTokenRefresh()`
- **인증**: 필수 (refreshToken 쿠키)
- **요청 필드**: 없음 (쿠키 기반)
- **응답 필드**:
  - success, detail (null), timestamp
  - 실제 토큰은 Set-Cookie 헤더로 전송됨
- **응답 쿠키**:
  - `accessToken` (HttpOnly, Secure, SameSite=Strict, 1시간)
  - `refreshToken` (HttpOnly, Secure, SameSite=Strict, 7일)
- **특징**:
  - refreshToken 쿠키를 사용해 새 토큰 회전 발급
  - 기존 리프레시 토큰은 ROTATED 상태로 폐기됨
  - 토큰은 HttpOnly 쿠키로 자동 관리 (XSS 방지)
  - 요청 본문 없음, 응답 본문도 비어있음 (토큰은 쿠키로만 전송)
  - onSuccess, onError 콜백 지원
  - 에러 발생 시 throw (AUTHENTICATION_FAILED, TOKEN_REUSED)

### 5-12. 지갑 조회

- **엔드포인트**: `GET /api/v1/wallet`
- **타입**: `src/types/wallet.ts` - `WalletInfo`
- **API**: `src/lib/api/wallet.ts` - `getWallet()`
- **훅**: `src/hooks/useWallet.ts` - `useWallet()`
- **인증**: 필수 (쿠키 기반)
- **응답 필드**:
  - walletId, userId
  - balance, totalPurchased, totalUsed
  - lastTransactionAt, createdAt, updatedAt
- **특징**:
  - 현재 사용자의 지갑 정보 조회
  - autoFetch 옵션 지원
  - 에러 콜백 지원
  - 새로고침 함수 (refresh) 제공
  - 에러 발생 시 throw (INVALID_TOKEN, WALLET_NOT_FOUND)

### 5-13. 잔액 조회

- **엔드포인트**: `GET /api/v1/wallet/balance`
- **타입**: `src/types/wallet.ts` - `WalletBalance`
- **API**: `src/lib/api/wallet.ts` - `getWalletBalance()`
- **훅**: `src/hooks/useWalletBalance.ts` - `useWalletBalance()`
- **인증**: 필수 (쿠키 기반)
- **응답 필드**:
  - balance (현재 코인 잔액)
- **특징**:
  - 지갑 잔액만 조회 (경량화된 API)
  - autoFetch 옵션 지원
  - 에러 콜백 지원
  - 새로고침 함수 (refresh) 제공
  - 에러 발생 시 throw (INVALID_TOKEN, WALLET_NOT_FOUND)

### 5-14. 거래 상세 조회

- **엔드포인트**: `GET /api/v1/transactions/{transactionId}`
- **타입**: `src/types/transaction.ts` - `TransactionDetail`, `TransactionType`
- **API**: `src/lib/api/transaction.ts` - `getTransactionDetail()`
- **훅**: `src/hooks/useTransactionDetail.ts` - `useTransactionDetail()`
- **인증**: 필수 (쿠키 기반)
- **경로 변수**:
  - `transactionId` (number)
- **응답 필드**:
  - transactionId, userId
  - roomId (nullable), messageId (nullable)
  - transactionType (purchase, usage, refund, bonus)
  - amount, balanceAfter
  - description, modelId (nullable)
  - createdAt
- **특징**:
  - 특정 거래의 상세 정보 조회
  - autoFetch 옵션 지원
  - 에러 콜백 지원
  - 새로고침 함수 (refresh) 제공
  - 에러 발생 시 throw (AUTHENTICATION_FAILED, TRANSACTION_NOT_FOUND)

### 5-15. 거래 내역 조회

- **엔드포인트**: `GET /api/v1/transactions`
- **타입**: `src/types/transaction.ts` - `Transaction`, `TransactionsPageResponse`, `GetTransactionsParams`
- **API**: `src/lib/api/transaction.ts` - `getTransactions()`
- **훅**: `src/hooks/useTransactions.ts` - `useTransactions()`
- **인증**: 필수 (쿠키 기반)
- **쿼리 파라미터**:
  - `page` (기본값: 0)
  - `size` (기본값: 20, 1~100)
  - `transactionType` (선택: purchase, usage, refund, bonus)
  - `startDate` (선택, YYYY-MM-DD 형식)
  - `endDate` (선택, YYYY-MM-DD 형식)
- **응답 필드**:
  - content[] (transactionId, transactionType, amount, balanceAfter, description, modelId, modelName, roomId, messageId, createdAt)
  - totalElements, totalPages, size, number
- **특징**:
  - 페이지네이션 지원
  - 거래 유형별 필터링 가능
  - 날짜 범위 필터링 가능
  - 동적 페이지/필터 조회 가능 (fetchTransactions(params))
  - autoFetch 옵션 지원
  - 새로고침 함수 (refresh) 제공
  - 에러 발생 시 throw (VALIDATION_ERROR, AUTHENTICATION_FAILED)

### 6. 메시지 목록 조회 (페이지네이션)

- **엔드포인트**: `GET /api/v1/messages/page/{roomId}`
- **타입**: `src/types/message.ts` - `MessagesPageResponse`
- **API**: `src/lib/api/message.ts` - `getMessages()`
- **훅**: `src/hooks/useMessages.ts`
  - `useMessages()`: 일반 페이지네이션
  - `useInfiniteMessages()`: 무한 스크롤
- **쿼리 파라미터**:
  - `page` (기본값: 0)
  - `size` (기본값: 50, 1~200)
  - `sort` (기본값: "createdAt,asc")

### 7. 메시지 전송 및 AI 응답 (SSE)

- **엔드포인트**: `POST /api/v1/messages/send/{roomId}`
- **타입**: `src/types/message.ts` - `SendMessageRequest`, `SSECompletedData`
- **API**: `src/lib/api/message.ts` - `sendMessageWithStreaming()`
- **훅**: `src/hooks/useChatWithAPI.ts` - `useChatWithAPI()`
- **특징**:
  - SSE (Server-Sent Events) 스트리밍
  - 이벤트 타입: `started`, `delta`, `completed`
  - 자동 파일 업로드 지원
  - AbortController로 중단 가능
- **요청 필드**:
  - `message` (필수, 최대 4,000자)
  - `modelId` (필수)
  - `fileId` (선택)
  - `previousResponseId` (선택)

### 8. 메시지 상세 조회

- **엔드포인트**: `GET /api/v1/messages/{messageId}`
- **타입**: `src/types/message.ts` - `MessageDetail`
- **API**: `src/lib/api/message.ts` - `getMessageDetail()`
- **훅**: `src/hooks/useMessageDetail.ts` - `useMessageDetail()`
- **응답 필드**:
  - messageId, roomId, role, content, fileUrl
  - tokenCount, coinCount, modelId, createdAt

## SSE 스트리밍 처리

메시지 전송 API는 SSE를 사용합니다. 이벤트 구조:

```
event:started
data:Message sending started

event:delta
data:안녕

event:delta
data:하세요

event:completed
data:{"aiResponseId":"...", "inputTokens":13, "userMessageId":"...", "outputTokens":285}
```

SSE 파싱 로직은 `src/lib/api/message.ts`의 `sendMessageWithStreaming()`에 구현되어 있습니다.

## 에러 처리

### 공통 에러 코드

- `VALIDATION_ERROR`: 입력값 검증 실패
- `AUTHENTICATION_FAILED`: 인증 실패
- `INVALID_TOKEN`: 인증 실패
- `FORBIDDEN`: 권한 없음
- `ROOM_NOT_FOUND`: 채팅방 없음
- `MESSAGE_NOT_FOUND`: 메시지 없음
- `MODEL_NOT_FOUND`: AI 모델 없음
- `PAYMENT_NOT_FOUND`: 결제 내역 없음
- `MODEL_NOT_ACTIVE`: AI 모델 비활성 상태
- `CONFLICT`: 충돌 (예: 사용 중인 모델 삭제 시도)
- `INSUFFICIENT_BALANCE`: 코인 부족 (402 Payment Required)
- `SYSTEM_ILLEGAL_STATE`: 시스템 오류

### 에러 처리 패턴

```typescript
switch (errorDetail.code) {
  case "SPECIFIC_ERROR":
    throw new Error("사용자 친화적인 메시지");
  default:
    throw new Error(errorDetail.message || "기본 에러 메시지");
}
```

## 새 API 연동 시 체크리스트

1. [ ] API 문서에서 엔드포인트, 메소드, 요청/응답 필드 확인
2. [ ] `src/types/[feature].ts`에 타입 정의
   - 요청 타입 (있는 경우)
   - 응답 타입 (ApiResponse<T> 사용)
3. [ ] `src/lib/api/[feature].ts`에 API 클라이언트 함수 작성
   - `credentials: 'include'` 필수
   - 에러 코드별 처리
4. [ ] `src/hooks/use[Feature].ts`에 커스텀 훅 작성
   - 로딩/에러 상태 관리
   - autoFetch 옵션 고려
5. [ ] 환경 변수 `NEXT_PUBLIC_API_BASE_URL` 설정 확인

## 주의사항

1. **Bearer 토큰 사용 금지**: API 문서에 Bearer로 명시되어 있어도 쿠키만 사용
2. **credentials 필수**: 모든 fetch에 `credentials: 'include'` 추가
3. **FormData 처리**: 파일 업로드 시 Content-Type 헤더를 설정하지 말 것 (자동 설정됨)
4. **SSE 파싱**: 이벤트와 데이터가 별도 라인으로 옴. 빈 라인이 구분자.
5. **페이지네이션**: page는 0부터 시작, size는 1~200 범위

## 유틸리티 함수

### 정렬 파라미터 생성

```typescript
// 메시지 정렬
import { createSortParam } from "@/types/message";
const sort = createSortParam("createdAt", "desc"); // "createdAt,desc"

// 채팅방 정렬
import { createRoomSortParam } from "@/types/room";
const sort = createRoomSortParam("lastMessageAt", "desc"); // "lastMessageAt,desc"
```

### 파일 검증

```typescript
import { validateFile } from "@/lib/api/upload";

const validation = validateFile(file);
if (!validation.isValid) {
}
```

## 참고

- Next.js 버전: 16.0.1
- React 버전: 19.2.0
- TypeScript 사용
- 현재 브랜치: `feat/first-mvp-api-connection`
- 서버 아직 배포 안됨 (로직만 구현)
