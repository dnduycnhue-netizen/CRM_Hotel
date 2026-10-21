import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = {
  title: 'Đăng nhập | CRM Chuỗi Khách Sạn',
  description: 'Đăng nhập hệ thống quản lý nội bộ chuỗi khách sạn',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4">
      <LoginForm />
    </div>
  );
}
