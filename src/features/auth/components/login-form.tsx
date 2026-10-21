'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/ui';
import { Input } from '@/shared/ui';
import { Label } from '@/shared/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';
import { loginAction } from '../actions';
import { Hotel, KeyRound, Mail, Loader2 } from 'lucide-react';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await loginAction(formData);
      if (res && !res.ok) {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/40">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
          <Hotel className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          CRM Chuỗi Khách Sạn
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Đăng nhập hệ thống quản lý khách hàng & cơ sở vật chất 8 cơ sở
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg bg-destructive/15 p-3 text-sm font-medium text-destructive border border-destructive/20">
              {errorMessage}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email nhân viên</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="letan@khachsan.vn"
                required
                className="pl-9 h-11"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="pl-9 h-11"
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-base font-semibold transition-all mt-2"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xác thực...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
