"use client";

import React, { useState, useEffect, useCallback } from "react";
import svgPathsSidebar from "@/assets/svgs/sidebar";
import { ChatRoom } from "@/types/room";
import { getChatRooms, updateChatRoom } from "@/lib/api/room";
import { SettingsMenu, SettingsButton } from "./SettingsMenu";

// ISO 8601 날짜를 UI 표시용 포맷으로 변환
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onDashboardClick?: () => void;
  onBalanceClick?: () => void;
  onHistoryClick?: () => void;
  onChatRoomClick?: (roomId: string) => void;
  onNewChatClick?: () => void;
  refreshTrigger?: number; // 이 값이 변경되면 채팅방 목록을 새로고침
}

export function Sidebar({ isOpen, onClose, onDashboardClick, onBalanceClick, onHistoryClick, onChatRoomClick, onNewChatClick, refreshTrigger }: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // 채팅방 목록 조회
  const fetchChatRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getChatRooms({ page: 0, size: 20, sort: "createdAt,desc" });
      // 메시지가 있는 채팅방만 필터링 (lastMessageAt이 있는 경우)
      const roomsWithMessages = response.detail.content.filter(
        (room) => room.lastMessageAt && room.lastMessageAt.trim() !== ""
      );
      setChatRooms(roomsWithMessages);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 초기 로드
  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  // 사이드바가 열릴 때 채팅방 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchChatRooms();
    }
  }, [isOpen, fetchChatRooms]);

  // refreshTrigger가 변경되면 채팅방 목록 새로고침
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchChatRooms();
    }
  }, [refreshTrigger, fetchChatRooms]);

  // 채팅방 제목 수정 시작
  const handleStartEdit = (roomId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoomId(roomId);
    setEditingTitle(currentTitle);
  };

  // 채팅방 제목 수정 취소
  const handleCancelEdit = () => {
    setEditingRoomId(null);
    setEditingTitle("");
  };

  // 채팅방 제목 수정 저장
  const handleSaveEdit = async (roomId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();

    const trimmedTitle = editingTitle.trim();

    // 유효성 검사
    if (!trimmedTitle) {
      alert("채팅방 제목을 입력해주세요.");
      return;
    }

    if (trimmedTitle.length > 30) {
      alert("채팅방 제목은 최대 30자까지 입력 가능합니다.");
      return;
    }

    try {
      await updateChatRoom(roomId, { title: trimmedTitle });
      await fetchChatRooms();
      setEditingRoomId(null);
      setEditingTitle("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "채팅방 제목 수정에 실패했습니다.";
      alert(errorMessage);
    }
  };

  // Enter 키로 저장, Escape 키로 취소
  const handleKeyDown = (roomId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit(roomId, e);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <>
      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[316px] bg-[#1d1f21] z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:relative lg:z-0`}
      >
        {/* Header */}
        <div className="h-[54px] border-b border-[#2c2e30]" />

        {/* New Chat Section */}
        <button
          onClick={onNewChatClick}
          className="h-[57px] border-b border-[#2c2e30] relative w-full hover:bg-[#2c2e30] transition-colors"
        >
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[normal] left-[5rem] not-italic text-[#ff7600] text-[16px] text-nowrap top-[1.7rem] whitespace-pre">
            new 채팅
          </p>
          <img src="/pencil.svg" alt="pencil" className="absolute left-[7px] top-[10px]" />
        </button>

        {/* AI Usage Section */}
        <button
          onClick={onDashboardClick}
          className="h-[57px] border-b border-[#2c2e30] relative w-full hover:bg-[#2c2e30] transition-colors"
        >
          <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[normal] left-[calc(12.5%+2.75px)] not-italic text-[16px] text-neutral-100 text-nowrap top-[19px] whitespace-pre">
            이번 달 AI 사용량 
          </p>
          <div className="absolute left-[5px] size-[30px] top-[13px]" data-name="bar-group-02">
            <div className="absolute flex inset-[12.5%] items-center justify-center">
              <div className="flex-none rotate-[180deg] scale-y-[-100%] size-[18px]">
                <div className="relative size-full" data-name="Icon">
                  <div className="absolute inset-[-4.444%]" style={{ "--stroke-0": "rgba(245, 245, 245, 1)" } as React.CSSProperties}>
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 25">
                      <path d={svgPathsSidebar.p1c82b380} id="Icon" stroke="var(--stroke-0, #F5F5F5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute left-[28px] size-[10px] top-[35px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 10">
              <circle cx="5" cy="5" fill="url(#paint0_linear_1_238)" id="Ellipse 2" r="5" />
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_238" x1="5" x2="5" y1="0" y2="10">
                  <stop stopColor="#FF983F" />
                  <stop offset="1" stopColor="#FF983F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </button>

        {/* Recent Chat Header */}
        <div className="px-4 py-3">
          <p className="font-['Pretendard:Regular',sans-serif] text-[16px]">
            <span className="text-neutral-100">최근</span>
            <span className="text-white"> 채팅</span>
          </p>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#ff983f] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#929292] text-[14px]">
              채팅 기록이 없습니다.
            </div>
          ) : (
            chatRooms.map((room) => (
              <div
                key={room.roomId}
                className="h-[45px] relative hover:bg-[#2c2e30] cursor-pointer group"
                onClick={() => editingRoomId !== room.roomId && onChatRoomClick?.(room.roomId)}
              >
                {editingRoomId === room.roomId ? (
                  // 편집 모드: 입력 필드
                  <div className="absolute left-[17px] top-[10px] flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(room.roomId, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="font-['Pretendard:Regular',sans-serif] text-[16px] text-neutral-100 bg-[#2c2e30] border border-[#ff7600] rounded px-2 py-1 w-[180px] outline-none"
                      maxLength={30}
                      autoFocus
                    />
                    <button
                      onClick={(e) => handleSaveEdit(room.roomId, e)}
                      className="text-[#ff7600] hover:text-[#ff983f] text-[12px]"
                      title="저장"
                    >
                      ✓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                      className="text-[#929292] hover:text-neutral-100 text-[12px]"
                      title="취소"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  // 일반 모드: 제목 텍스트
                  <>
                    <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[normal] left-[17px] not-italic text-[16px] text-neutral-100 top-[10px] w-[149px] truncate">
                      {room.title}
                    </p>
                    <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[normal] right-[45px] not-italic text-[#444648] text-[13px] text-right top-[18px]">
                      {formatDate(room.lastMessageAt || room.createdAt)}
                    </p>
                    {/* 편집 버튼 (호버 시 표시) */}
                    <button
                      onClick={(e) => handleStartEdit(room.roomId, room.title, e)}
                      className="absolute right-[17px] top-[13px] w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="제목 수정"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="#929292" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Settings Section - Bottom Left */}
        <div className="relative border-t border-[#2c2e30] p-3">
          <SettingsButton onClick={() => setIsSettingsOpen(true)} />
          <SettingsMenu
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onBalanceClick={onBalanceClick}
            onHistoryClick={onHistoryClick}
          />
        </div>
      </div>
    </>
  );
}
