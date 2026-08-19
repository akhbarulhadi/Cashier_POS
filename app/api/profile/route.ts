import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUserWithStore } from "@/lib/auth-helpers";
import { createClient } from "@/utils/supabase/server";
import { ApiError } from "@/lib/api-error";

export async function PATCH(request: NextRequest) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUserWithStore();
    const body = await request.json();
    const { fullName, phone, email, currentPassword, newPassword } = body;

    const supabase = await createClient();

    if (newPassword || (email && email !== currentUser.email)) {
      if (!currentPassword) {
        throw ApiError.badRequest("Current password is required");
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });
      if (signInError) {
        throw ApiError.badRequest("Invalid current password");
      }
    }

    const updates: any = {};
    if (newPassword) updates.password = newPassword;
    if (email && email !== currentUser.email) updates.email = email;
    if (fullName) updates.data = { full_name: fullName };

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) {
        throw ApiError.badRequest(updateError.message);
      }
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        fullName: fullName || currentUser.fullName,
        phone: phone !== undefined ? phone : currentUser.phone,
        email: email || currentUser.email,
      },
    });

    return apiSuccess(updated, "Profile successfully updated");
  });
}
