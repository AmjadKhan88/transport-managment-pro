import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { ROLE_LABELS } from "@/config/roles";
import { Field } from "@/components/ui/FormParts";
import { cardClass, inputClass, primaryBtn } from "@/components/ui/styles";

const STRONG = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function AccountTab() {
  const { user, refresh } = useAuth();

  const [name, setName] = useState(user.name);
  const profile = useMutation({
    mutationFn: () => authService.updateProfile(name.trim()),
    onSuccess: async () => {
      await refresh();
      toast.success("Name updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const onPw = (e) => setPw((p) => ({ ...p, [e.target.name]: e.target.value }));
  const password = useMutation({
    mutationFn: () => authService.changePassword(pw.currentPassword, pw.newPassword),
    onSuccess: () => {
      toast.success("Password changed. Other devices have been logged out.");
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const weak = pw.newPassword.length > 0 && !STRONG.test(pw.newPassword);
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.newPassword;
  const canSave = pw.currentPassword && STRONG.test(pw.newPassword) && pw.newPassword === pw.confirm;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          profile.mutate();
        }}
        className={`${cardClass} space-y-4 p-5`}
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">My profile</h2>
        <Field label="Name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className={inputClass} />
        </Field>
        <Field label="Email">
          <input value={user.email} disabled className={`${inputClass} opacity-70`} />
        </Field>
        <Field label="Role">
          <input value={ROLE_LABELS[user.role]} disabled className={`${inputClass} opacity-70`} />
        </Field>
        <button type="submit" disabled={profile.isPending || !name.trim() || name.trim() === user.name} className={primaryBtn}>
          {profile.isPending ? "Saving…" : "Save name"}
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          password.mutate();
        }}
        className={`${cardClass} space-y-4 p-5`}
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Change password</h2>
        <Field label="Current password" required>
          <input name="currentPassword" type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={onPw} className={inputClass} />
        </Field>
        <Field label="New password" required hint="At least 8 characters, with a letter and a number.">
          <input name="newPassword" type="password" autoComplete="new-password" required value={pw.newPassword} onChange={onPw} className={inputClass} />
          {weak && <p className="mt-1 text-[13px] text-red-700 dark:text-red-400">Needs 8+ characters, a letter and a number.</p>}
        </Field>
        <Field label="Confirm new password" required>
          <input name="confirm" type="password" autoComplete="new-password" required value={pw.confirm} onChange={onPw} className={inputClass} />
          {mismatch && <p className="mt-1 text-[13px] text-red-700 dark:text-red-400">The passwords don't match.</p>}
        </Field>
        <button type="submit" disabled={password.isPending || !canSave} className={primaryBtn}>
          {password.isPending ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}