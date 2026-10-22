'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/ui';
import { Input } from '@/shared/ui';
import { Label } from '@/shared/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';
import { loginAction } from '../actions';
import {
  Hotel,
  KeyRound,
  Mail,
  Loader2,
  Sparkles,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await loginAction(formData);
      if (res && !res.ok) {
        setErrorMessage(res.error.message || 'Email hoặc mật khẩu không chính xác.');
      }
    });
  };

  const handleQuickFillAdmin = () => {
    setEmailValue('dnduycnhue@gmail.com');
    setPasswordValue('Cy3ZcjXWBf-Qem.');
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md relative">
      {/* Decorative ambient glow */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full shadow-2xl border-white/10 bg-slate-900/90 text-slate-100 backdrop-blur-2xl relative overflow-hidden rounded-2xl">
        {/* Top gold accent line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        <CardHeader className="space-y-3 text-center pt-8 pb-4">
          <div className="mx-auto relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
            <Hotel className="h-8 w-8" />
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              CRM Chuỗi Khách Sạn
            </CardTitle>
            <CardDescription className="text-xs text-amber-300/80 font-medium tracking-wide mt-1">
              Hệ thống quản lý nội bộ 8 cơ sở · 240 phòng
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 pb-8 px-6 sm:px-8">
          {/* Quick Demo Login Pill */}
          <button
            type="button"
            onClick={handleQuickFillAdmin}
            className="w-full py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Điền nhanh tài khoản Chủ chuỗi (Admin)</span>
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl bg-rose-500/15 p-3 text-xs font-semibold text-rose-300 border border-rose-500/30 flex items-start gap-2">
                <span className="shrink-0 text-rose-400 font-bold">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email nhân viên
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="nhanvien@khachsan.vn"
                  required
                  className="pl-10 h-11 bg-slate-800/80 border-slate-700/80 text-white placeholder:text-slate-500 rounded-xl focus:border-amber-400 focus:ring-amber-400/20 transition-all text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                  Mật khẩu
                </Label>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-slate-800/80 border-slate-700/80 text-white placeholder:text-slate-500 rounded-xl focus:border-amber-400 focus:ring-amber-400/20 transition-all text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-xl shadow-lg shadow-amber-600/30 transition-all hover:shadow-amber-600/40 mt-3"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng Nhập Hệ Thống'
              )}
            </Button>
          </form>

          {/* Footer security badges */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Bảo mật RLS 2 lớp</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
              <span>8 Khách sạn đồng bộ</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
