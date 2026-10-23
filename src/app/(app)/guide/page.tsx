import type { Metadata } from "next";
import { GuideHub } from "@/features/guide";

export const metadata: Metadata = {
  title: "Hướng Dẫn Sử Dụng & Bản Vẽ Quy Trình (SOP) | CRM Khách Sạn",
  description:
    "Cẩm nang hướng dẫn sử dụng chi tiết cho từng vai trò nhân sự và sơ đồ workflow quy trình nghiệp vụ khách sạn.",
};

export default function GuidePage() {
  return <GuideHub />;
}
