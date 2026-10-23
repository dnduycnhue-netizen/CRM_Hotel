"use client";

import {
  Building2,
  CheckCircle2,
  Crown,
  Edit3,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/shared/ui";
import { createUserAction, updateUserAction } from "../actions";
import type { AdminUserItem } from "../data/users";
import type { SystemRole } from "../domain/types";

interface Props {
  initialUsers: AdminUserItem[];
  branches: Array<{ id: string; name: string; code?: string }>;
  roles: SystemRole[];
}

export function UsersTable({ initialUsers, branches, roles }: Props) {
  const [userList, setUserList] = useState<AdminUserItem[]>(initialUsers);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Form State
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("Hotel@123456");
  const [createFullName, setCreateFullName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createRoleId, setCreateRoleId] = useState(roles[0]?.id || "");
  const [createBranchId, setCreateBranchId] = useState("");

  // Edit Form State
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const openEditModal = (u: AdminUserItem) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditPhone(u.phone || "");
    setEditRoleId(u.roles[0]?.role_id || roles[0]?.id || "");
    setEditBranchId(u.default_branch_id || "");
    setEditIsActive(u.is_active);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("email", createEmail);
    formData.append("password", createPassword);
    formData.append("fullName", createFullName);
    formData.append("phone", createPhone);
    formData.append("roleId", createRoleId);
    formData.append("branchId", createBranchId);

    startTransition(async () => {
      const res = await createUserAction(formData);
      if (res.ok) {
        toast.success(`Đã tạo tài khoản cho nhân sự ${createFullName}!`);
        setIsCreateOpen(false);
        // Reset form
        setCreateEmail("");
        setCreateFullName("");
        setCreatePhone("");

        const selectedRole = roles.find((r) => r.id === createRoleId);
        const selectedBranch = branches.find((b) => b.id === createBranchId);

        // Optimistically add to list
        const newUser: AdminUserItem = {
          id: res.data.id,
          full_name: res.data.fullName,
          phone: createPhone || null,
          default_branch_id: createBranchId || null,
          default_branch_name: selectedBranch ? selectedBranch.name : null,
          is_active: true,
          created_at: new Date().toISOString(),
          roles: [
            {
              role_id: createRoleId,
              role_name: selectedRole?.name || "Lễ tân",
              role_key: selectedRole?.key || "receptionist",
              branch_id: createBranchId || null,
              branch_name: selectedBranch ? selectedBranch.name : "Toàn chuỗi",
            },
          ],
        };
        setUserList((prev) => [newUser, ...prev]);
      } else {
        toast.error(res.error.message || "Lỗi khi tạo tài khoản");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData();
    formData.append("userId", editingUser.id);
    formData.append("fullName", editFullName);
    formData.append("phone", editPhone);
    formData.append("roleId", editRoleId);
    formData.append("branchId", editBranchId);
    formData.append("isActive", editIsActive ? "true" : "false");

    startTransition(async () => {
      const res = await updateUserAction(formData);
      if (res.ok) {
        toast.success(`Đã cập nhật vai trò & quyền cho ${editFullName}!`);
        setEditingUser(null);

        const selectedRole = roles.find((r) => r.id === editRoleId);
        const selectedBranch = branches.find((b) => b.id === editBranchId);

        setUserList((prev) =>
          prev.map((u) => {
            if (u.id === editingUser.id) {
              return {
                ...u,
                full_name: editFullName,
                phone: editPhone || null,
                default_branch_id: editBranchId || null,
                default_branch_name: selectedBranch
                  ? selectedBranch.name
                  : null,
                is_active: editIsActive,
                roles: [
                  {
                    role_id: editRoleId,
                    role_name: selectedRole?.name || "Nhân viên",
                    role_key: selectedRole?.key || "",
                    branch_id: editBranchId || null,
                    branch_name: selectedBranch
                      ? selectedBranch.name
                      : "Toàn chuỗi",
                  },
                ],
              };
            }
            return u;
          }),
        );
      } else {
        toast.error(res.error.message || "Lỗi khi cập nhật tài khoản");
      }
    });
  };

  const filtered = userList.filter((u) => {
    if (filterBranch !== "all" && u.default_branch_id !== filterBranch)
      return false;
    if (filterRole !== "all") {
      const hasRole = u.roles.some(
        (r) => r.role_key === filterRole || r.role_id === filterRole,
      );
      if (!hasRole) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = u.full_name.toLowerCase().includes(q);
      const matchPhone = u.phone ? u.phone.includes(q) : false;
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Button */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md shadow-amber-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                Tài Khoản Nhân Sự & Phân Quyền
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/25">
                8 Khách Sạn
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Thêm tài khoản, gán vai trò nhân sự (Lễ tân, Quản lý, Sales, Kỹ
              thuật) và chỉ định cơ sở làm việc
            </p>
          </div>
        </div>

        {/* The Key Button the user was looking for! */}
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="h-10 px-5 text-xs font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-xl shadow-md shadow-amber-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          <span>+ Thêm Tài Khoản Nhân Sự Mới</span>
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/70 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng số tài khoản
            </p>
            <p className="text-2xl font-black text-foreground mt-1">
              {userList.length} nhân sự
            </p>
          </div>
          <span className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Users className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Đang hoạt động
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {userList.filter((u) => u.is_active).length} tài khoản
            </p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cơ sở chuỗi
            </p>
            <p className="text-2xl font-black text-primary mt-1">
              {branches.length} cơ sở
            </p>
          </div>
          <span className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
            <Building2 className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full bg-background rounded-lg pl-9 pr-3 h-9.5 text-xs font-medium"
          />
        </div>

        <div className="w-48">
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="w-full bg-background border border-border/70 rounded-lg px-3 h-9.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">Tất cả cơ sở</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full bg-background border border-border/70 rounded-lg px-3 h-9.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Hiển thị <strong>{filtered.length}</strong> nhân sự
        </div>
      </div>

      {/* Users table */}
      <Card className="border-border/70 shadow-xs overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/40 text-xs uppercase font-bold text-muted-foreground">
                <th className="py-3 px-4">Nhân sự</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Vai trò đảm nhiệm</th>
                <th className="py-3 px-4">Cơ sở làm việc</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-xs text-muted-foreground"
                  >
                    <p className="font-semibold text-foreground text-sm">
                      Chưa tìm thấy nhân sự phù hợp
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bấm nút "+ Thêm tài khoản nhân sự mới" để cấp tài khoản
                      đầu tiên.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-foreground text-xs block">
                            {user.full_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {user.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-foreground">
                      {user.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Chưa có SĐT
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.length > 0 ? (
                          user.roles.map((r, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                r.role_key === "owner"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : r.role_key === "branch_manager"
                                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              {r.role_name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Chưa phân vai trò
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                      {user.default_branch_name ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {user.default_branch_name}
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 font-bold">
                          Toàn chuỗi (8 KS)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> Đã khóa
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="h-8 text-xs font-semibold px-3 text-primary hover:bg-accent border-border/70 rounded-lg shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        <span>Sửa & Cấp quyền</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ================= MODAL 1: THÊM TÀI KHOẢN MỚI ================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border/70 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Thêm Tài Khoản Nhân Sự Mới
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tạo tài khoản đăng nhập và gán vai trò trực tiếp vào chuỗi
                    khách sạn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Họ và tên nhân sự *
                  </Label>
                  <Input
                    required
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    placeholder="Nguyễn Thị Lan"
                    className="h-9.5 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Số điện thoại
                  </Label>
                  <Input
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="0912345678"
                    className="h-9.5 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Email đăng nhập *
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    required
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="lan.letan@khachsan.vn"
                    className="pl-9.5 h-9.5 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Mật khẩu khởi tạo *
                </Label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="pl-9.5 h-9.5 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Vai trò đảm nhiệm *
                  </Label>
                  <select
                    value={createRoleId}
                    onChange={(e) => setCreateRoleId(e.target.value)}
                    className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Cơ sở công tác *
                  </Label>
                  <select
                    value={createBranchId}
                    onChange={(e) => setCreateBranchId(e.target.value)}
                    className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Toàn chuỗi (8 khách sạn)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Đang khởi tạo...
                    </>
                  ) : (
                    "Tạo Tài Khoản & Gán Quyền"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: SỬA VAI TRÒ & PHÂN QUYỀN ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border/70 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-600" />
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Cấp Quyền & Sửa Nhân Sự: {editingUser.full_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Điều chỉnh vai trò đảm nhiệm, cơ sở công tác hoặc trạng thái
                    khóa tài khoản
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Họ và tên nhân sự *
                  </Label>
                  <Input
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="h-9.5 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Số điện thoại
                  </Label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-9.5 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Vai trò đảm nhiệm *
                  </Label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Cơ sở làm việc *
                  </Label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Toàn chuỗi (8 khách sạn)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <Label className="text-xs font-bold text-foreground block mb-1.5">
                  Trạng thái tài khoản
                </Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <input
                      type="radio"
                      name="isActive"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                      className="accent-emerald-600"
                    />
                    <span>Hoạt động bình thường</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <input
                      type="radio"
                      name="isActive"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                      className="accent-rose-600"
                    />
                    <span>Khóa tài khoản</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu Thay Đổi & Cập Nhật Quyền"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
