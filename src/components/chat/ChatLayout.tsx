"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { ModelSelector } from "./ModelSelector";
import { ChatInput } from "./ChatInput";
import { WelcomeMessage } from "./WelcomeMessage";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { MessageList } from "./MessageList";
import { Dashboard } from "../dashboard/Dashboard";
import { Balance } from "../balance/Balance";
import { BalanceWarning } from "./BalanceWarning";
import { useChatWithAPI } from "@/hooks/useChatWithAPI";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createChatRoom } from "@/lib/api/room";
import { getWalletBalance } from "@/lib/api/wallet";
import svgPathsMain from "@/assets/svgs/main";

// 채팅방 제목 생성 함수 (현재 시간 기반)
function generateChatRoomTitle(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `새 대화 ${month}/${day} ${hours}:${minutes}`;
}

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  // 현재 로그인한 사용자 정보 조회
  const { user } = useCurrentUser();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // 채팅방 생성 함수
  const createNewChatRoom = useCallback(async (modelId: number) => {
    setIsCreatingRoom(true);
    try {
      const response = await createChatRoom({
        title: generateChatRoomTitle(),
        modelId,
      });
      const newRoomId = response.detail.roomId;
      setRoomId(newRoomId);
      return newRoomId;
    } catch (error) {
      throw error;
    } finally {
      setIsCreatingRoom(false);
    }
  }, []);

  // 채팅방 입장 시 잔액 체크
  const checkBalanceOnRoomEnter = useCallback(async () => {
    try {
      const balanceResponse = await getWalletBalance();
      const currentBalance = balanceResponse.detail.balance;

      if (currentBalance < 0) {
        setWarningMessage("현재 잔액이 부족합니다. 코인을 충전해주세요.");
        setHasInsufficientBalance(true);
      } else if (currentBalance <= 10) {
        setWarningMessage(`현재 남은 코인은 ${currentBalance.toFixed(2)}개입니다.`);
        setHasInsufficientBalance(false);
      } else {
        setWarningMessage(null);
        setHasInsufficientBalance(false);
      }
    } catch (error) {
      console.error("잔액 조회 실패:", error);
    }
  }, []);

  // roomId 변경 시 잔액 체크 (새 채팅방 입장 시)
  useEffect(() => {
    if (roomId) {
      checkBalanceOnRoomEnter();
    }
  }, [roomId, checkBalanceOnRoomEnter]);

  // 첫 메시지 전송 시 채팅방이 자동 생성됨 (useChatWithAPI의 createRoom 콜백 사용)

  const {
    messages,
    message,
    setMessage,
    handleSendMessage,
    handleSubmit,
    isStreaming,
    isUploadingFile,
    pastedImage,
    handlePasteImage,
    removePastedImage,
    handleFileUpload,
    loadMessagesForRoom,
    clearMessages,
  } = useChatWithAPI({
    roomId: roomId || "",
    modelId: selectedModelId || 0,
    onError: (error) => {
    },
    createRoom: async () => {
      if (!selectedModelId) {
        throw new Error("모델을 선택해주세요.");
      }
      const newRoomId = await createNewChatRoom(selectedModelId);
      return newRoomId;
    },
    onRoomCreated: (newRoomId) => {
      setRoomId(newRoomId);
    },
    onMessageComplete: () => {
      // 메시지 전송 완료 시 사이드바 채팅방 목록 새로고침
      setSidebarRefreshTrigger((prev) => prev + 1);
    },
  });

  // New Chat 버튼 클릭 핸들러
  const handleNewChat = useCallback(async () => {
    if (isCreatingRoom || !selectedModelId) return;
    try {
      await createNewChatRoom(selectedModelId);
      clearMessages();
      setSidebarRefreshTrigger((prev) => prev + 1);
    } catch (error) {
    }
  }, [selectedModelId, isCreatingRoom, createNewChatRoom, clearMessages]);

  // 잔액 체크를 포함한 메시지 전송 핸들러
  const handleSubmitWithBalanceCheck = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // 메시지가 없거나 스트리밍 중이면 전송하지 않음
      if ((!message.trim() && !pastedImage) || isStreaming) {
        return;
      }

      // 파일 업로드 중이면 전송하지 않음
      if (isUploadingFile) {
        setWarningMessage("이미지 업로드 중입니다. 잠시만 기다려주세요.");
        return;
      }

      try {
        // 1. 잔액 조회
        const balanceResponse = await getWalletBalance();
        const currentBalance = balanceResponse.detail.balance;

        // 2. 잔액이 0 미만인지 체크
        if (currentBalance < 0) {
          setHasInsufficientBalance(true);
          setWarningMessage("현재 잔액이 부족합니다. 코인을 충전해주세요.");
          return;
        }

        // 3. 잔액이 충분하면 정상적으로 메시지 전송
        setHasInsufficientBalance(false);
        handleSendMessage(message, pastedImage);
        setMessage("");
      } catch (error) {
        console.error("잔액 조회 실패:", error);
        // 잔액 조회 실패 시에도 메시지 전송은 허용 (API 에러 처리)
        handleSendMessage(message, pastedImage);
        setMessage("");
      }
    },
    [message, pastedImage, isStreaming, isUploadingFile, handleSendMessage, setMessage]
  );

  // 채팅방 클릭 핸들러 (사이드바에서 채팅방 선택 시)
  const handleChatRoomClick = useCallback(async (clickedRoomId: string) => {
    if (clickedRoomId === roomId) {
      // 이미 같은 채팅방이면 사이드바만 닫기
      setSidebarOpen(false);
      return;
    }

    setRoomId(clickedRoomId);
    await loadMessagesForRoom(clickedRoomId);
    setSidebarOpen(false);
  }, [roomId, loadMessagesForRoom]);

  // Dashboard를 보여줄 때
  if (showDashboard) {
    return <Dashboard onClose={() => setShowDashboard(false)} />;
  }

  // Balance를 보여줄 때
  if (showBalance) {
    return <Balance onBack={() => setShowBalance(false)} />;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onDashboardClick={() => {
          setShowDashboard(true);
          setSidebarOpen(false);
        }}
        onBalanceClick={() => {
          setShowBalance(true);
          setSidebarOpen(false);
        }}
        onHistoryClick={() => {
          setShowDashboard(true);
          setSidebarOpen(false);
        }}
        onChatRoomClick={handleChatRoomClick}
        onNewChatClick={() => {
          handleNewChat();
          setSidebarOpen(false);
        }}
        refreshTrigger={sidebarRefreshTrigger}
      />

      {/* Main Content */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)",
          }}
        />
        <div className="absolute bg-zinc-950 inset-0" />

        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 h-[58px] sm:h-[65px] md:h-[75px] flex items-center px-3 sm:px-4 md:px-[21px] z-30">
          {/* Left Section: Menu Button and Model Selector */}
          <div className="flex gap-4 sm:gap-6 md:gap-[36px]">
            {/* Menu Button */}
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
              }}
              className="h-16 w-[50px] sm:h-12 sm:w-[52px] md:h-[35px] md:w-[42px] hover:opacity-80 transition-opacity"
            >
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 35">
                <g>
                  <path d={svgPathsMain.p3902ef00} stroke="#444648" />
                  <path d={svgPathsMain.p38192d70} stroke="#929292" strokeWidth="2" />
                </g>
              </svg>
            </button>

            {/* Model Selector */}
            <ModelSelector
              onModelChange={(model) => {
                setSelectedModelId(model.modelId);
              }}
            />
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            disabled={isCreatingRoom}
            className="h-11 sm:h-10 md:h-[35px] rounded-[5px] px-5 sm:px-4 md:px-4 border border-[#ff983f] flex items-center gap-2 sm:gap-2 hover:bg-[#ff983f]/10 transition-colors ml-auto disabled:opacity-50"
          >
            <div className="size-[13px] sm:size-[12px] md:size-[1px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13 13">
                <path d="M6.5 1L6.5 12M12 6.5L1 6.5" stroke="url(#paint0_linear_new_chat)" strokeLinecap="round" strokeWidth="2" />
                <defs>
                  <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_new_chat" x1="6.5" x2="6.5" y1="1" y2="12">
                    <stop stopColor="#FF983F" />
                    <stop offset="1" stopColor="#FF983F" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="bg-[#ff983f] bg-clip-text font-['Pretendard:Regular',sans-serif] text-[15px] sm:text-[15px] md:text-[15px] hidden sm:inline" style={{ WebkitTextFillColor: "transparent" }}>
              New Chat
            </span>
          </button>
        </div>

        {/* Welcome Message and Suggested Prompts - only show when no messages */}
        {messages.length === 0 && (
          <>
            <WelcomeMessage username={user?.username || user?.email?.split("@")[0]} />
            <SuggestedPrompts onPromptClick={handleSendMessage} />
          </>
        )}

        {/* Message List - show when there are messages */}
        <MessageList messages={messages} isStreaming={isStreaming} />

        {/* Balance Warning - show above Chat Input */}
        <div className="absolute bottom-[115px] sm:bottom-[120px] md:bottom-[120px] left-0 right-0 flex justify-center">
          {warningMessage && (
            <BalanceWarning
              message={warningMessage}
              onDismiss={() => setWarningMessage(null)}
            />
          )}
        </div>

        {/* Chat Input */}
        <ChatInput
          message={message}
          setMessage={setMessage}
          onSubmit={handleSubmitWithBalanceCheck}
          isStreaming={isStreaming || isCreatingRoom || !selectedModelId}
          pastedImage={pastedImage}
          onPasteImage={handlePasteImage}
          onRemoveImage={removePastedImage}
          onFileSelect={handleFileUpload}
          isUploadingFile={isUploadingFile}
          hasInsufficientBalance={hasInsufficientBalance}
        />
      </div>
    </div>
  );
}
