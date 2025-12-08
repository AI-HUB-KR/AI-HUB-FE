"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface UserInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserInfoDialog({ isOpen, onClose }: UserInfoDialogProps) {
  const { user, isLoading, error, fetchUser, updateUser } = useCurrentUser({
    autoFetch: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 모달이 열릴 때 사용자 정보 조회
  useEffect(() => {
    if (isOpen) {
      fetchUser();
      setIsEditing(false);
    }
  }, [isOpen, fetchUser]);

  // 사용자 정보가 로드되면 편집 폼에 반영
  useEffect(() => {
    if (user) {
      setEditUsername(user.username);
      setEditEmail(user.email);
    }
  }, [user]);

  // 편집 모드 시작
  const handleStartEdit = () => {
    if (user) {
      setEditUsername(user.username);
      setEditEmail(user.email);
      setIsEditing(true);
    }
  };

  // 편집 취소
  const handleCancelEdit = () => {
    if (user) {
      setEditUsername(user.username);
      setEditEmail(user.email);
    }
    setIsEditing(false);
  };

  // 정보 수정 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUser({ username: editUsername, email: editEmail });
      setIsEditing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "정보 수정에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#2c2e30] border-[#3c3e40] text-neutral-100 max-w-[672px]">
        <DialogHeader>
          <DialogTitle className="text-neutral-100 text-2xl">내 정보 조회</DialogTitle>
          <DialogDescription className="text-[#929292] text-base">
            회원 정보를 확인하고 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-10 h-10 border-2 border-[#ff983f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-red-400 text-lg">
            {error.message}
          </div>
        ) : user ? (
          <div className="space-y-5">
            {/* 사용자 ID */}
            <div>
              <label className="block text-base font-medium text-[#929292] mb-1.5">
                사용자 ID
              </label>
              <div className="px-4 py-3 bg-[#1d1f21] rounded-lg text-neutral-100 text-lg">
                {user.userId}
              </div>
            </div>

            {/* 사용자 이름 */}
            <div>
              <label className="block text-base font-medium text-[#929292] mb-1.5">
                사용자 이름
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1d1f21] border border-[#ff7600] rounded-lg text-neutral-100 text-lg outline-none"
                  maxLength={30}
                />
              ) : (
                <div className="px-4 py-3 bg-[#1d1f21] rounded-lg text-neutral-100 text-lg">
                  {user.username}
                </div>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-base font-medium text-[#929292] mb-1.5">
                이메일
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1d1f21] border border-[#ff7600] rounded-lg text-neutral-100 text-lg outline-none"
                />
              ) : (
                <div className="px-4 py-3 bg-[#1d1f21] rounded-lg text-neutral-100 text-lg">
                  {user.email}
                </div>
              )}
            </div>

            {/* 계정 상태 */}
            <div>
              <label className="block text-base font-medium text-[#929292] mb-1.5">
                계정 상태
              </label>
              <div className="px-4 py-3 bg-[#1d1f21] rounded-lg">
                <span className={`text-lg ${user.isActivated ? "text-green-400" : "text-red-400"}`}>
                  {user.isActivated ? "활성화됨" : "비활성화됨"}
                </span>
              </div>
            </div>

            {/* 가입일 */}
            <div>
              <label className="block text-base font-medium text-[#929292] mb-1.5">
                가입일
              </label>
              <div className="px-4 py-3 bg-[#1d1f21] rounded-lg text-neutral-100 text-lg">
                {formatDate(user.createdAt)}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-5 py-3 bg-[#3c3e40] text-neutral-100 text-base rounded-lg hover:bg-[#4c4e50] transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-3 bg-[#ff7600] text-white text-base rounded-lg hover:bg-[#ff983f] transition-colors disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-5 py-3 bg-[#3c3e40] text-neutral-100 text-base rounded-lg hover:bg-[#4c4e50] transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleStartEdit}
                className="px-5 py-3 bg-[#ff7600] text-white text-base rounded-lg hover:bg-[#ff983f] transition-colors"
              >
                정보 수정
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
