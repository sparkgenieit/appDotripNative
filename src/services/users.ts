// src/services/users.ts
import { api } from './http';

export type CheckPhoneResult = {
  exists: boolean;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export async function checkPhone(phone: string): Promise<CheckPhoneResult> {
  if (!phone) return { exists: false };
  const res = await api(`/users/check-phone?phone=${encodeURIComponent(phone)}`);
  if (!res.ok) return { exists: false };
  try {
    const j = await res.json();
    // robust to multiple shapes
    return {
      exists: !!(j.exists ?? j.found ?? j.user),
      name: j.name ?? j.user?.name ?? null,
      email: j.email ?? j.user?.email ?? null,
      phone: j.phone ?? j.user?.phone ?? phone,
    };
  } catch {
    return { exists: false };
  }
}
