import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    // Только админы могут управлять менеджерами
    await requireRole("admin");

    const supabase = getSupabaseAdmin();

    // Получаем всех пользователей с их ролями
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");

    if (rolesError) {
      console.error("[Admin Managers] Error fetching roles:", rolesError);
      return NextResponse.json(
        { error: "Failed to fetch roles", details: rolesError.message },
        { status: 500 }
      );
    }

    // Получаем информацию о пользователях из auth.users (через admin API)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("[Admin Managers] Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users", details: usersError.message },
        { status: 500 }
      );
    }

    // Получаем дополнительные данные из profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url");

    if (profilesError) {
      console.error("[Admin Managers] Error fetching profiles:", profilesError);
    }

    // Собираем данные вместе
    const usersWithRoles = users.map((user: any) => {
      const role = roles?.find((r: any) => r.user_id === user.id);
      const profile = profiles?.find((p: any) => p.id === user.id);

      return {
        id: user.id,
        email: user.email,
        role: role?.role || "user",
        created_at: user.created_at,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        last_sign_in_at: user.last_sign_in_at,
      };
    });

    // Сортируем: админы, потом менеджеры, потом пользователи
    usersWithRoles.sort((a: any, b: any) => {
      const roleOrder = { admin: 0, manager: 1, user: 2 };
      return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
    });

    return NextResponse.json({ users: usersWithRoles });
  } catch (error: any) {
    console.error("[Admin Managers] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Только админы могут управлять менеджерами
    await requireRole("admin");

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 }
      );
    }

    if (!["user", "manager", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be: user, manager, or admin" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Upsert роли пользователя
    const { error } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: role,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("[Admin Managers] Error updating role:", error);
      return NextResponse.json(
        { error: "Failed to update role", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    console.error("[Admin Managers] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Только админы могут удалять роли
    await requireRole("admin");

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Удаляем роль (вернётся к дефолтной "user")
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[Admin Managers] Error deleting role:", error);
      return NextResponse.json(
        { error: "Failed to delete role", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admin Managers] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
