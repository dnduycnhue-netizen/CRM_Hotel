export interface ProvinceOption {
  code: string;
  name: string;
}

export const VIETNAM_PROVINCES: ProvinceOption[] = [
  { code: "01", name: "Hà Nội" },
  { code: "79", name: "Thành phố Hồ Chí Minh" },
  { code: "31", name: "Hải Phòng" },
  { code: "48", name: "Đà Nẵng" },
  { code: "92", name: "Cần Thơ" },
  { code: "46", name: "Thừa Thiên Huế" },
  { code: "24", name: "Bắc Giang" },
  { code: "27", name: "Bắc Ninh" },
  { code: "11", name: "Điện Biên" },
  { code: "10", name: "Lào Cai" },
  { code: "14", name: "Sơn La" },
  { code: "17", name: "Hòa Bình" },
  { code: "19", name: "Thái Nguyên" },
  { code: "20", name: "Lạng Sơn" },
  { code: "22", name: "Quảng Ninh" },
  { code: "25", name: "Phú Thọ" },
  { code: "38", name: "Thanh Hóa" },
  { code: "40", name: "Nghệ An" },
  { code: "42", name: "Hà Tĩnh" },
  { code: "44", name: "Quảng Bình" },
  { code: "49", name: "Quảng Nam" },
  { code: "51", name: "Quảng Ngãi" },
  { code: "52", name: "Bình Định" },
  { code: "54", name: "Phú Yên" },
  { code: "56", name: "Khánh Hòa" },
  { code: "64", name: "Gia Lai" },
  { code: "66", name: "Đắk Lắk" },
  { code: "68", name: "Lâm Đồng" },
  { code: "74", name: "Bình Dương" },
  { code: "75", name: "Đồng Nai" },
  { code: "77", name: "Bà Rịa - Vũng Tàu" },
  { code: "82", name: "Tiền Giang" },
  { code: "89", name: "An Giang" },
  { code: "96", name: "Cà Mau" },
];

export function getProvinceName(code?: string | null): string {
  if (!code) return "";
  const found = VIETNAM_PROVINCES.find((p) => p.code === code);
  return found ? found.name : code;
}

