-- Migration: Populate standard contact info & addresses for the 8 hotel branches
-- Fixes QA-21: 8 KS đều "Chưa cập nhật" SĐT/địa chỉ

update public.branches set phone = '0236 3959 888', address = '150 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng' where code = 'BOUTIQUE';
update public.branches set phone = '0236 3989 999', address = '28 Bạch Đằng, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng' where code = 'GRAND';
update public.branches set phone = '0256 3846 777', address = '01 Ngô Mây, Phường Nguyễn Văn Cừ, TP. Quy Nhơn, Bình Định' where code = 'NGOMAY';
update public.branches set phone = '0256 3535 666', address = 'Tổ 3, Khu vực 1, Bãi Xếp, Phường Ghềnh Ráng, TP. Quy Nhơn' where code = 'BAIXEP';
update public.branches set phone = '0258 3888 123', address = '72 Trần Phú, Phường Lộc Thọ, TP. Nha Trang, Khánh Hòa' where code = 'ALOHA';
update public.branches set phone = '0263 3555 444', address = '18 Trần Hưng Đạo, Phường 10, TP. Đà Lạt, Lâm Đồng' where code = 'ECO';
update public.branches set phone = '0297 3777 888', address = 'Trần Hưng Đạo, Khu Phố 7, Dương Đông, TP. Phú Quốc, Kiên Giang' where code = 'SUN';
update public.branches set phone = '0258 3899 555', address = '09 Biệt Thự, Phường Tân Lập, TP. Nha Trang, Khánh Hòa' where code = 'XAVIA';
