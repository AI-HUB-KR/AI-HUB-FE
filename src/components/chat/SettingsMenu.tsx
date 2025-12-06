"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth";

// 쿠키에서 값을 읽는 헬퍼 함수
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

interface MenuItemProps {
  icon: string;
  label: React.ReactNode;
  onClick?: () => void;
}

function MenuItem({ icon, label, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 text-left transition-colors hover:bg-[#3c3e40] rounded-lg px-3 py-2"
    >
      <img src={icon} alt="" className="size-[24px]" />
      <p
        className="text-[14px] text-neutral-100"
        style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 400 }}
      >
        {label}
      </p>
    </button>
  );
}

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceClick?: () => void;
  onHistoryClick?: () => void;
}

export function SettingsMenu({ isOpen, onClose, onBalanceClick, onHistoryClick }: SettingsMenuProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const refreshToken = getCookie("refreshToken");

      if (refreshToken) {
        await logout({ refreshToken });
      }

      // 로그아웃 성공 시 로그인 페이지로 이동
      router.push("/login");
    } catch (error) {
      // 에러가 발생해도 로그인 페이지로 이동 (쿠키가 만료된 경우 등)
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  const handleBalance = () => {
    onBalanceClick?.();
    onClose();
  };

  const handleHistory = () => {
    onHistoryClick?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Menu */}
      <div className="absolute bottom-[70px] left-4 z-50 w-[220px] rounded-[15px] bg-[#2c2e30] p-4 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
        <div className="space-y-1">
          <MenuItem icon="/logout.svg" label="로그아웃" onClick={handleLogout} />
          <MenuItem icon="/wallet.svg" label="잔액 조회" onClick={handleBalance} />
        </div>
      </div>
    </>
  );
}

interface SettingsButtonProps {
  onClick: () => void;
}

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#2c2e30]"
    >
      <img src="/setting.svg" alt="" className="size-[24px]" />
      <p
        className="text-[14px] text-neutral-100"
        style={{ fontFamily: "Pretendard, sans-serif", fontWeight: 400 }}
      >
        환경설정
      </p>
    </button>
  );
}
