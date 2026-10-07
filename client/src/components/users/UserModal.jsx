import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import { inputClass, labelClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { ROLE_OPTIONS } from "@/config/roles";
import { userService } from "@/services/userService";

const TITLES = { create: "Add user", edit: "Edit user", password: "Reset password" };

export default function UserModal({ mode, user, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "view_only",
    password: "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "create") return userService.create(form);
      if (mode === "edit")
        return userService.update(user.id, { name: form.name, email: form.email, role: form.role });
      return userService.resetPassword(user.id, form.password);
    },
    onSuccess: () => {
      toast.success(mode === "password" ? "Password reset" : "User saved");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal title={TITLES[mode]} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode !== "password" && (
          <>
            <div>
              <label className={labelClass}>Full name</label>
              <input name="name" required value={form.name} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" required value={form.email} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select name="role" value={form.role} onChange={onChange} className={inputClass}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {mode !== "edit" && (
          <div>
            <label className={labelClass}>{mode === "password" ? "New password" : "Password"}</label>
            <input name="password" type="password" required minLength={8} autoComplete="new-password"
              value={form.password} onChange={onChange} placeholder="Minimum 8 characters" className={inputClass} />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}