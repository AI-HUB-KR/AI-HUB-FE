"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import svgPathsDashboard from "@/assets/svgs/dashboard";
import svgPathsModelUsage from "@/assets/svgs/modelUsage";
import svgPathsMonthlyUsage from "@/assets/svgs/monthlyUsage";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useMonthlyUsage } from "@/hooks/useMonthlyUsage";
import { useModelsPricing } from "@/hooks/useModelsPricing";
import { useInfiniteRooms } from "@/hooks/useRooms";
import { useTransactions } from "@/hooks/useTransactions";
import { ModelPricing } from "@/types/dashboard";
import { TransactionType } from "@/types/transaction";

interface DashboardProps {
  onClose: () => void;
}

const slides = [
  { id: 0, title: "내 총 코인량" },
  { id: 1, title: "AI모델별 코인 사용량" },
  { id: 2, title: "월별 사용 코인량" },
];

// dailyUsage를 SVG path로 변환하는 헬퍼 함수
function createSVGPath(data: { date: string; coinUsed: number }[], width: number, height: number): string {
  if (!data || data.length === 0) return "";

  const maxCoinUsed = Math.max(...data.map((d) => d.coinUsed), 1);
  const xStep = width / (data.length - 1 || 1);

  const points = data.map((point, index) => {
    const x = index * xStep;
    const y = height - (point.coinUsed / maxCoinUsed) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(" L ")}`;
}

// Y축 레이블 생성 헬퍼 함수
function generateYAxisLabels(maxValue: number): string[] {
  if (maxValue === 0) return ["0", "0", "0"];

  const roundedMax = Math.ceil(maxValue / 1000) * 1000;
  const step = roundedMax / 2;

  return [
    `${roundedMax / 1000}k`,
    `${step / 1000}k`,
    `${(step / 2) / 1000}k`
  ];
}

// 날짜를 "M월" 형식으로 변환
function formatDateToMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월`;
}

// 날짜를 "M/D" 형식으로 변환
function formatDateToMD(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 날짜를 "YYYY/MM/DD" 형식으로 변환
function formatDateToYMD(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

// 거래 유형 한글 변환
function getTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case "purchase":
      return "구매";
    case "usage":
      return "사용";
    case "refund":
      return "환불";
    case "bonus":
      return "보너스";
    default:
      return "기타";
  }
}

// 거래 유형별 색상 반환
function getTransactionTypeColor(type: TransactionType): {
  bg: string;
  text: string;
  amount: string;
} {
  switch (type) {
    case "purchase":
      return { bg: "bg-green-600/20", text: "text-green-400", amount: "text-green-400" };
    case "usage":
      return { bg: "bg-red-600/20", text: "text-red-400", amount: "text-red-400" };
    case "refund":
      return { bg: "bg-blue-600/20", text: "text-blue-400", amount: "text-blue-400" };
    case "bonus":
      return { bg: "bg-[#ff7600]/20", text: "text-[#ff7600]", amount: "text-[#ff7600]" };
    default:
      return { bg: "bg-gray-600/20", text: "text-gray-400", amount: "text-gray-400" };
  }
}

// 일별 데이터를 주별로 집계하는 헬퍼 함수
function aggregateToWeekly(dailyData: { date: string; coinUsed: number; messageCount: number }[]): {
  date: string;
  coinUsed: number;
  messageCount: number;
}[] {
  if (!dailyData || dailyData.length === 0) return [];

  const weeklyData: { date: string; coinUsed: number; messageCount: number }[] = [];

  for (let i = 0; i < dailyData.length; i += 7) {
    const weekData = dailyData.slice(i, i + 7);
    const totalCoinUsed = weekData.reduce((sum, day) => sum + day.coinUsed, 0);
    const totalMessageCount = weekData.reduce((sum, day) => sum + day.messageCount, 0);

    // 주의 시작 날짜를 대표 날짜로 사용
    weeklyData.push({
      date: weekData[0].date,
      coinUsed: totalCoinUsed,
      messageCount: totalMessageCount,
    });
  }

  return weeklyData;
}

// 일별 데이터를 월별로 집계하는 헬퍼 함수
function aggregateToMonthly(dailyData: { date: string; coinUsed: number; messageCount: number }[]): {
  date: string;
  coinUsed: number;
  messageCount: number;
}[] {
  if (!dailyData || dailyData.length === 0) return [];

  const monthlyMap = new Map<string, { coinUsed: number; messageCount: number }>();

  dailyData.forEach((day) => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { coinUsed: 0, messageCount: 0 });
    }

    const monthData = monthlyMap.get(monthKey)!;
    monthData.coinUsed += day.coinUsed;
    monthData.messageCount += day.messageCount;
  });

  // Map을 배열로 변환 (월 첫날을 date로 사용)
  return Array.from(monthlyMap.entries()).map(([monthKey, data]) => ({
    date: `${monthKey}-01`,
    coinUsed: data.coinUsed,
    messageCount: data.messageCount,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// 최근 5개월의 빈 월별 데이터 생성 (데이터가 없을 때 사용)
function generateEmptyMonthlyData(): { date: string; coinUsed: number; messageCount: number }[] {
  const now = new Date();
  const emptyData: { date: string; coinUsed: number; messageCount: number }[] = [];

  for (let i = 4; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    emptyData.push({
      date: dateStr,
      coinUsed: 0,
      messageCount: 0,
    });
  }

  return emptyData;
}

// 기간 선택 드롭다운 컴포넌트
function PeriodDropdown({
  value,
  onChange,
}: {
  value: "monthly" | "weekly";
  onChange: (value: "monthly" | "weekly") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-[27px] rounded-[4px] px-2 border border-[#929292] flex items-center gap-2 hover:border-[#ff7600] transition-colors"
      >
        <svg className="w-[17px] h-[19px]" fill="none" viewBox="0 0 19 22">
          <path
            d="M17 3H15V1M4 3H2V1M4 3H15M4 3V5M15 3V5M2 9V19C2 20.1046 2.89543 21 4 21H15C16.1046 21 17 20.1046 17 19V9M2 9H17M2 9V7C2 5.89543 2.89543 5 4 5H15C16.1046 5 17 5.89543 17 7V9"
            stroke="#F5F5F5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        <p className="font-['Pretendard:Regular',sans-serif] text-[#e0e0e0] text-[13px] sm:text-[15px]">
          {value}
        </p>
        <svg className="w-[13px] h-[17px]" fill="none" viewBox="0 0 13 17">
          <path
            d="M2 7L7.00081 11.58L12 7"
            stroke="#F5F5F5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 드롭다운 메뉴 */}
          <div className="absolute top-full right-0 mt-1 w-[120px] bg-[#1d1f21] border border-[#444648] rounded-[4px] shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => {
                onChange("monthly");
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-[13px] sm:text-[15px] font-['Pretendard:Regular',sans-serif] transition-colors ${
                value === "monthly"
                  ? "bg-[#ff7600] text-white"
                  : "text-[#e0e0e0] hover:bg-[#2c2e30]"
              }`}
            >
              monthly
            </button>
            <button
              onClick={() => {
                onChange("weekly");
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-[13px] sm:text-[15px] font-['Pretendard:Regular',sans-serif] transition-colors ${
                value === "weekly"
                  ? "bg-[#ff7600] text-white"
                  : "text-[#e0e0e0] hover:bg-[#2c2e30]"
              }`}
            >
              weekly
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PriceCard({ model }: { model: ModelPricing }) {
  return (
    <div className="relative rounded-[8px] border border-[#444648] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
      <div className="p-4">
        {/* 모델명과 상태 */}
        <div className="mb-3 flex items-center justify-between">
          <p
            className="text-[16px] text-white"
            style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 600 }}
          >
            {model?.displayName || 'Unknown Model'}
          </p>
          {model?.isActive ? (
            <span className="inline-flex items-center rounded-full bg-gradient-to-b from-[#ff7600] to-[#ff983f] px-2 py-1 text-[11px] text-white">
              활성
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#444648] px-2 py-1 text-[11px] text-[#929292]">
              비활성
            </span>
          )}
        </div>

        {/* 가격 정보 그리드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p
              className="text-[11px] text-[#929292]"
              style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 400 }}
            >
              Input
            </p>
            <p
              className="text-[13px] text-white"
              style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 600 }}
            >
              ${(model?.inputPricePer1k ?? 0).toFixed(3)}
            </p>
          </div>

          <div className="space-y-1">
            <p
              className="text-[11px] text-[#929292]"
              style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 400 }}
            >
              Output
            </p>
            <p
              className="text-[13px] text-white"
              style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 600 }}
            >
              ${(model?.outputPricePer1k ?? 0).toFixed(3)}
            </p>
          </div>

          <div className="space-y-1">
            <p
              className="text-[11px] text-[#929292]"
              style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 400 }}
            >
              Average
            </p>
            <p
              className="text-[13px] text-[#ff7600]"
              style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 600 }}
            >
              ${(model?.averagePricePer1k ?? 0).toFixed(3)}
            </p>
          </div>
        </div>

        {/* 1K 토큰당 표시 */}
        <p
          className="mt-2 text-right text-[10px] text-[#929292]"
          style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 400 }}
        >
          per 1K tokens
        </p>
      </div>
    </div>
  );
}

function ModelPriceContent({
  models,
  isLoading,
  error
}: {
  models: ModelPricing[];
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[15px] bg-[rgba(29,31,33,0.95)] p-4 sm:p-5">
        <h2
          className="mb-4 text-[20px] text-neutral-100 sm:text-[24px]"
          style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 600 }}
        >
          AI 모델 토큰 가격
        </h2>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[#929292]">로딩 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-red-500">{error.message}</p>
          </div>
        )}

        {/* 모델 리스트 */}
        {!isLoading && !error && models && models.length > 0 ? (
          <>
            <div className="space-y-3">
              {models.map((model) => (
                <PriceCard key={model.modelId} model={model} />
              ))}
            </div>

            {/* 하단 안내 */}
            <div className="mt-4 border-t border-[#444648] pt-4">
              <p
                className="text-center text-[12px] text-[#929292]"
                style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 400 }}
              >
                모든 가격은 USD 기준이며 1M토큰당 가격입니다
              </p>
            </div>
          </>
        ) : !isLoading && !error ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-[#929292]">모델 정보가 없습니다</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Dashboard({ onClose }: DashboardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<"dashboard" | "pricing">("dashboard");

  // 각 슬라이드별 드롭다운 상태 (monthly/weekly)
  const [slide1Period, setSlide1Period] = useState<"monthly" | "weekly">("monthly");
  const [slide2Period, setSlide2Period] = useState<"monthly" | "weekly">("monthly");
  const [slide3Period, setSlide3Period] = useState<"monthly" | "weekly">("monthly");

  // 거래 내역 필터 상태
  const [currentPage, setCurrentPage] = useState(0);

  // API 훅 사용
  const { stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { usage, isLoading: usageLoading, error: usageError } = useMonthlyUsage();
  const { models, isLoading: modelsLoading, error: modelsError } = useModelsPricing();
  const {
    rooms,
    isLoading: roomsLoading,
    isFetchingMore: roomsFetchingMore,
    error: roomsError,
    hasMore: hasMoreRooms,
    fetchMoreRooms,
  } = useInfiniteRooms({
    pageSize: 3, // 3개씩 로드
    sortField: "createdAt", // lastMessageAt은 null일 수 있어서 createdAt 사용
    sortDirection: "desc",
  });

  // 거래 내역 훅
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    fetchTransactions,
    refresh: refreshTransactions,
  } = useTransactions({
    page: currentPage,
    size: 5,
    transactionType: undefined,
    autoFetch: true,
  });

  const paginate = (newDirection: number) => {
    setCurrentSlide((prev) => {
      const next = prev + newDirection;
      if (next < 0) return slides.length - 1;
      if (next >= slides.length) return 0;
      return next;
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] overflow-y-auto" data-name="대시보드 UI">
      <div className="max-w-[508px] mx-auto px-4 sm:px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="h-[35px] rounded-[5px] w-[48px] hover:bg-[#2c2e30] transition-colors border border-[#444648] flex items-center justify-center"
          >
            <svg className="size-[24px]" fill="none" viewBox="0 0 24 24">
              <path
                d={svgPathsDashboard.p20b2fe00}
                stroke="#F5F5F5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-[#1d1f21] h-[71px] rounded-lg flex items-center justify-center gap-3 sm:gap-4 px-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`rounded-[7px] h-[53px] flex-1 max-w-[200px] font-['Pretendard:Regular',sans-serif] text-white text-[18px] sm:text-[22px] whitespace-nowrap transition-colors ${
              activeTab === "dashboard"
                ? "bg-gradient-to-b from-[#ff7600] from-[29.808%] to-[#ff983f]"
                : "bg-transparent hover:bg-[#2c2e30]"
            }`}
          >
            대시보드
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`rounded-[7px] h-[53px] flex-1 max-w-[200px] font-['Pretendard:Regular',sans-serif] text-white text-[18px] sm:text-[22px] whitespace-nowrap transition-colors ${
              activeTab === "pricing"
                ? "bg-gradient-to-b from-[#ff7600] from-[29.808%] to-[#ff983f]"
                : "bg-transparent hover:bg-[#2c2e30]"
            }`}
          >
            모델당 가격
          </button>
        </div>

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <>
            {/* Cards Carousel Section */}
            <div className="relative w-full h-[280px] sm:h-[300px] overflow-hidden">
              <motion.div
                key={currentSlide}
                custom={currentSlide}
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -10000) {
                    paginate(1);
                  } else if (swipe > 10000) {
                    paginate(-1);
                  }
                }}
                className="w-full h-full"
              >
                {currentSlide === 0 && (
                  <div className="relative h-full w-full bg-[rgba(29,31,33,0.95)] rounded-[15px] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-['Pretendard:SemiBold',sans-serif] text-neutral-100 text-[20px] sm:text-[24px]">
                        내 총 코인량
                      </p>
                      <PeriodDropdown value={slide1Period} onChange={setSlide1Period} />
                    </div>

                    {usageLoading ? (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-[#929292]">로딩 중...</p>
                      </div>
                    ) : usageError ? (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-red-500">{usageError.message}</p>
                      </div>
                    ) : usage ? (
                      <>
                        {/* Chart container */}
                        <div className="relative h-[180px] sm:h-[200px] w-full flex">
                          {(() => {
                            const hasData = usage.dailyUsage.length > 0;
                            const sourceData = hasData ? aggregateToMonthly(usage.dailyUsage) : generateEmptyMonthlyData();
                            // 최근 5개월만 표시
                            const displayData = sourceData.slice(-5);
                            const maxCoinUsed = Math.max(...displayData.map(d => d.coinUsed), 1);

                            return (
                              <>
                                {/* Y-axis labels */}
                                <div className="flex flex-col justify-between py-2 pr-2 text-white font-['Pretendard:SemiBold',sans-serif] text-[12px] sm:text-[14px]">
                                  {generateYAxisLabels(maxCoinUsed).map((label, i) => (
                                    <span key={i}>{label}</span>
                                  ))}
                                </div>

                                {/* Chart */}
                                <div className="flex-1 relative">
                                  <svg
                                    className="absolute inset-0 w-full h-full"
                                    fill="none"
                                    preserveAspectRatio="none"
                                    viewBox="0 0 340 116"
                                  >
                                    <path
                                      d={createSVGPath(displayData, 340, 116)}
                                      stroke="#FF7600"
                                      strokeWidth="2"
                                      opacity={hasData ? "1" : "0.3"}
                                    />
                                  </svg>

                                  {/* 데이터 없을 때 오버레이 메시지 */}
                                  {!hasData && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <p className="text-[#929292] text-[13px] sm:text-[15px] text-center px-4 font-['Pretendard:Regular',sans-serif]">
                                        아직 사용 내역이 없습니다
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* X-axis labels */}
                        <div className="flex justify-between mt-2 px-8 text-white font-['Pretendard:SemiBold',sans-serif] text-[13px] sm:text-[16px]">
                          {(() => {
                            const hasData = usage.dailyUsage.length > 0;
                            const sourceData = hasData ? aggregateToMonthly(usage.dailyUsage) : generateEmptyMonthlyData();
                            const displayData = sourceData.slice(-5);
                            return displayData.map((month, i) => (
                              <span key={i}>{formatDateToMonth(month.date)}</span>
                            ));
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-[#929292]">데이터를 불러올 수 없습니다</p>
                      </div>
                    )}
                  </div>
                )}

                {currentSlide === 1 && (
                  <div className="relative h-full w-full bg-[rgba(29,31,33,0.95)] rounded-[15px] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-['Pretendard:SemiBold',sans-serif] text-neutral-100 text-[18px] sm:text-[24px]">
                        AI모델별 코인 사용량
                      </p>
                      <PeriodDropdown value={slide2Period} onChange={setSlide2Period} />
                    </div>

                    {usageLoading ? (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-[#929292]">로딩 중...</p>
                      </div>
                    ) : usageError ? (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-red-500">{usageError.message}</p>
                      </div>
                    ) : usage && usage.modelUsage.length > 0 ? (
                      <>
                        {/* Horizontal bar chart */}
                        <div className="space-y-4 mb-3">
                          {usage.modelUsage.map((model, index) => (
                            <div key={model.modelId} className="flex items-center gap-2">
                              <span className="font-['Pretendard:SemiBold',sans-serif] text-white text-[11px] sm:text-[12px] w-[60px] truncate">
                                {model.displayName}
                              </span>
                              <div
                                className={`flex-1 h-[18px] sm:h-[21px] rounded-br-[8px] rounded-tr-[8px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] ${
                                  index === 0 ? "bg-[#ff7600]" : "bg-[#e0e0e0]"
                                }`}
                                style={{ width: `${model.percentage}%` }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* X-axis labels */}
                        <div className="flex justify-between pl-[68px] mt-2 text-white font-['Pretendard:SemiBold',sans-serif] text-[13px] sm:text-[16px]">
                          {(() => {
                            const maxCoinUsed = Math.max(...usage.modelUsage.map(m => m.coinUsed));
                            const step = Math.ceil(maxCoinUsed / 4 / 1000) * 1000;
                            return [0, 1, 2, 3, 4].map(i => (
                              <span key={i}>{i === 0 ? "0" : `${(step * i) / 1000}K`}</span>
                            ));
                          })()}
                        </div>
                      </>
                    ) : usage ? (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-[#929292] text-[13px] sm:text-[15px] text-center px-4 font-['Pretendard:Regular',sans-serif]">
                          AI 모델을 사용하면 통계가 표시됩니다
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-[#929292]">데이터를 불러올 수 없습니다</p>
                      </div>
                    )}
                  </div>
                )}

                {currentSlide === 2 && (
                  <div className="relative h-full w-full bg-[rgba(29,31,33,0.95)] rounded-[15px] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-['Pretendard:SemiBold',sans-serif] text-neutral-100 text-[20px] sm:text-[24px]">
                        월별 사용 코인량
                      </p>
                      <PeriodDropdown value={slide3Period} onChange={setSlide3Period} />
                    </div>

                    {usageLoading ? (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-[#929292]">로딩 중...</p>
                      </div>
                    ) : usageError ? (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-red-500">{usageError.message}</p>
                      </div>
                    ) : usage ? (
                      <>
                        {/* Chart container */}
                        <div className="relative h-[180px] sm:h-[200px] w-full flex">
                          {(() => {
                            const hasData = usage.dailyUsage.length > 0;
                            const sourceData = hasData ? aggregateToMonthly(usage.dailyUsage) : generateEmptyMonthlyData();
                            // 최근 5개월만 표시
                            const displayData = sourceData.slice(-5);
                            const maxCoinUsed = Math.max(...displayData.map(d => d.coinUsed), 1);

                            return (
                              <>
                                {/* Y-axis labels */}
                                <div className="flex flex-col justify-between py-2 pr-2 text-white font-['Pretendard:SemiBold',sans-serif] text-[12px] sm:text-[14px]">
                                  {generateYAxisLabels(maxCoinUsed).map((label, i) => (
                                    <span key={i}>{label}</span>
                                  ))}
                                </div>

                                {/* Chart */}
                                <div className="flex-1 relative">
                                  <svg
                                    className="absolute inset-0 w-full h-full"
                                    fill="none"
                                    preserveAspectRatio="none"
                                    viewBox="0 0 350 144"
                                  >
                                    <path
                                      d={createSVGPath(displayData, 350, 144)}
                                      stroke="#FF7600"
                                      strokeWidth="2"
                                      opacity={hasData ? "1" : "0.3"}
                                    />
                                  </svg>

                                  {/* 데이터 없을 때 오버레이 메시지 */}
                                  {!hasData && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <p className="text-[#929292] text-[13px] sm:text-[15px] text-center px-4 font-['Pretendard:Regular',sans-serif]">
                                        아직 사용 내역이 없습니다
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* X-axis labels */}
                        <div className="flex justify-between mt-2 px-8 text-white font-['Pretendard:SemiBold',sans-serif] text-[13px] sm:text-[16px]">
                          {(() => {
                            const hasData = usage.dailyUsage.length > 0;
                            const sourceData = hasData ? aggregateToMonthly(usage.dailyUsage) : generateEmptyMonthlyData();
                            const displayData = sourceData.slice(-5);
                            return displayData.map((month, i) => (
                              <span key={i}>{formatDateToMonth(month.date)}</span>
                            ));
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
                        <p className="text-[#929292]">데이터를 불러올 수 없습니다</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Pagination dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((slide) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(slide.id)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === slide.id ? "w-6 bg-[#ff7600]" : "w-2 bg-gray-400"
                    }`}
                    aria-label={`Go to slide ${slide.id + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* 채팅별 사용 코인량 Section */}
            <div className="bg-[rgba(29,31,33,0.95)] rounded-[15px] p-4 sm:p-6">
              <h2 className="font-['Pretendard:SemiBold',sans-serif] text-neutral-100 text-[20px] sm:text-[24px] mb-4">
                채팅별 사용 코인량
              </h2>

              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[#929292]">로딩 중...</p>
                </div>
              ) : roomsError ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-500">{roomsError.message}</p>
                </div>
              ) : rooms.length > 0 ? (
                <div className="space-y-3">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_2fr_auto] gap-2 sm:gap-4 text-white font-['Pretendard:Regular',sans-serif] text-[14px] sm:text-[16px] px-2">
                    <div>Date</div>
                    <div>Topic</div>
                    <div>amount</div>
                  </div>

                  {/* Table Rows */}
                  <div className="space-y-2">
                    {rooms.map((room) => (
                      <div
                        key={room.roomId}
                        className="grid grid-cols-[1fr_2fr_auto] gap-2 sm:gap-4 border border-[#444648] rounded-[8px] p-3 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] text-white font-['Pretendard:Regular',sans-serif] text-[12px] sm:text-[13px]"
                      >
                        <div className="truncate">
                          {formatDateToYMD(room.lastMessageAt || room.createdAt)}
                        </div>
                        <div className="truncate">{room.title}</div>
                        <div className="text-right">
                          {room.coinUsage > 0
                            ? `-${room.coinUsage.toFixed(3)}개`
                            : '0개'}
                        </div>
                      </div>
                    ))}

                    {/* 더보기 버튼 */}
                    {hasMoreRooms && (
                      <button
                        onClick={fetchMoreRooms}
                        disabled={roomsFetchingMore}
                        className="w-full border border-[#444648] rounded-[8px] p-3 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:border-[#ff7600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <p className="font-['Pretendard:Regular',sans-serif] text-[13px] text-white rotate-90">
                          {roomsFetchingMore ? '...' : '...'}
                        </p>
                      </button>
                    )}
                  </div>

                  {/* 안내 텍스트 */}
                  <p className="text-[#929292] text-[11px] sm:text-[12px] text-center mt-3 font-['Pretendard:Regular',sans-serif]">
                    사용 토큰량은 소수점 셋째 자리까지 표시됩니다
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[#929292]">채팅방이 없습니다</p>
                </div>
              )}
            </div>

            {/* 코인 거래 내역 Section */}
            <div className="bg-[rgba(29,31,33,0.95)] rounded-[15px] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Pretendard:SemiBold',sans-serif] text-neutral-100 text-[20px] sm:text-[24px]">
                  코인 거래 내역
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshTransactions}
                    className="h-[27px] w-[27px] rounded-[4px] border border-[#929292] flex items-center justify-center hover:border-[#ff7600] transition-colors"
                    title="새로고침"
                  >
                    <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5M21 10V4M21 10H15"
                        stroke="#F5F5F5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[#929292]">로딩 중...</p>
                </div>
              ) : transactionsError ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-500">{transactionsError.message}</p>
                </div>
              ) : transactions && transactions.content.length > 0 ? (
                <div className="space-y-3">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-2 sm:gap-4 text-white font-['Pretendard:Regular',sans-serif] text-[13px] sm:text-[15px] px-2">
                    <div>Date</div>
                    <div>Description</div>
                    <div className="text-right">Amount</div>
                    <div className="text-right">Balance</div>
                  </div>

                  {/* Table Rows */}
                  <div className="space-y-2">
                    {transactions.content.map((transaction) => {
                      const colors = getTransactionTypeColor(transaction.transactionType);
                      const isPositive = transaction.amount > 0;

                      return (
                        <div
                          key={transaction.transactionId}
                          className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-2 sm:gap-4 border border-[#444648] rounded-[8px] p-3 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] text-white font-['Pretendard:Regular',sans-serif] text-[11px] sm:text-[13px]"
                        >
                          <div className="truncate">
                            {formatDateToYMD(transaction.createdAt)}
                          </div>
                          <div className="truncate">
                            {transaction.description}
                          </div>
                          <div className={`text-right ${colors.amount}`}>
                            {isPositive ? '+' : ''}{transaction.amount.toFixed(2)}$
                          </div>
                          <div className="text-right text-[#929292]">
                            {transaction.balanceAfter.toFixed(2)}$
                          </div>
                        </div>
                      );
                    })}

                    {/* 페이지네이션 버튼 */}
                    {transactions.totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                          disabled={currentPage === 0}
                          className="px-3 py-2 rounded-[4px] border border-[#444648] text-white text-[13px] hover:border-[#ff7600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          이전
                        </button>
                        <span className="text-[#e0e0e0] text-[13px] font-['Pretendard:Regular',sans-serif]">
                          {currentPage + 1} / {transactions.totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(transactions.totalPages - 1, prev + 1))}
                          disabled={currentPage >= transactions.totalPages - 1}
                          className="px-3 py-2 rounded-[4px] border border-[#444648] text-white text-[13px] hover:border-[#ff7600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          다음
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 안내 텍스트 */}
                  <p className="text-[#929292] text-[11px] sm:text-[12px] text-center mt-3 font-['Pretendard:Regular',sans-serif]">
                    거래 금액은 달러($) 단위로 표시됩니다
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[#929292]">거래 내역이 없습니다</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pricing Content */}
        {activeTab === "pricing" && (
          <ModelPriceContent
            models={models}
            isLoading={modelsLoading}
            error={modelsError}
          />
        )}
      </div>
    </div>
  );
}
