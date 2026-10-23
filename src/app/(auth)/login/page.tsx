import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = {
  title: "Đăng nhập | CRM Chuỗi Khách Sạn (8 Cơ Sở · 240 Phòng)",
  description: "Đăng nhập hệ thống quản lý nội bộ chuỗi khách sạn",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#0a0e17] overflow-hidden">
      {/* Background radial gradient layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.15),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.08),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Floating subtle ambient stars / lights */}
      <div className="relative z-10 w-full max-w-md my-8">
        <LoginForm />
      </div>
    </div>
  );
}
