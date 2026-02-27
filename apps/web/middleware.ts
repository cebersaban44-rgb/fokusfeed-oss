import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo";
const userId = process.env.NEXT_PUBLIC_USER_ID ?? "user-demo";
const onboardingPath = "/onboarding";
const digestPath = "/digest";

interface TwitterStatusPayload {
  data?: {
    connected?: boolean;
  };
}

async function getTwitterConnected(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/v1/profile/twitter/status`, {
      method: "GET",
      headers: {
        "x-tenant-id": tenantId,
        "x-user-id": userId
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as TwitterStatusPayload;
    return Boolean(payload.data?.connected);
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) {
    return true;
  }

  if (pathname.startsWith("/api/")) {
    return true;
  }

  if (pathname.includes(".")) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const connected = await getTwitterConnected();
  const isOnboarding = pathname === onboardingPath;

  if (!connected && !isOnboarding) {
    return NextResponse.redirect(new URL(onboardingPath, request.url));
  }

  if (connected && isOnboarding) {
    return NextResponse.redirect(new URL(digestPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
