-- 20261101000056_vietnam_provinces_and_guest_address.sql
-- Nạp danh mục 34 tỉnh/thành phố trực thuộc Trung ương hiện hành vào public.admin_provinces

insert into public.admin_provinces (code, name)
values
  ('01', 'Hà Nội'),
  ('79', 'Thành phố Hồ Chí Minh'),
  ('31', 'Hải Phòng'),
  ('48', 'Đà Nẵng'),
  ('92', 'Cần Thơ'),
  ('46', 'Thừa Thiên Huế'),
  ('24', 'Bắc Giang'),
  ('27', 'Bắc Ninh'),
  ('11', 'Điện Biên'),
  ('10', 'Lào Cai'),
  ('14', 'Sơn La'),
  ('17', 'Hòa Bình'),
  ('19', 'Thái Nguyên'),
  ('20', 'Lạng Sơn'),
  ('22', 'Quảng Ninh'),
  ('25', 'Phú Thọ'),
  ('38', 'Thanh Hóa'),
  ('40', 'Nghệ An'),
  ('42', 'Hà Tĩnh'),
  ('44', 'Quảng Bình'),
  ('49', 'Quảng Nam'),
  ('51', 'Quảng Ngãi'),
  ('52', 'Bình Định'),
  ('54', 'Phú Yên'),
  ('56', 'Khánh Hòa'),
  ('64', 'Gia Lai'),
  ('66', 'Đắk Lắk'),
  ('68', 'Lâm Đồng'),
  ('74', 'Bình Dương'),
  ('75', 'Đồng Nai'),
  ('77', 'Bà Rịa - Vũng Tàu'),
  ('82', 'Tiền Giang'),
  ('89', 'An Giang'),
  ('96', 'Cà Mau')
on conflict (code) do update
  set name = excluded.name;

