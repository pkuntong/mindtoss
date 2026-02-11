import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const ok = () => new Response("ok", { status: 200, headers: corsHeaders });

const getTokenFromHeader = (req: Request) => {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }
  return authHeader.replace("Bearer ", "").trim();
};

const withErrorHandling = (handler: (ctx: any, req: Request) => Promise<Response>) =>
  httpAction(async (ctx, req) => {
    try {
      return await handler(ctx, req);
    } catch (error: any) {
      console.error("HTTP route error:", error);
      const rawMessage = String(error?.message || "Request failed.");
      const firstLine = rawMessage.split("\n")[0];
      const message = firstLine.replace(/^Uncaught Error:\s*/, "");
      return json(400, {
        error: message || "Request failed.",
      });
    }
  });

const registerOptionsRoute = (path: string) => {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => ok()),
  });
};

registerOptionsRoute("/api/auth/sign-up");
registerOptionsRoute("/api/auth/sign-in");
registerOptionsRoute("/api/auth/apple");
registerOptionsRoute("/api/auth/session");
registerOptionsRoute("/api/auth/sign-out");
registerOptionsRoute("/api/account/delete");
registerOptionsRoute("/api/state");
registerOptionsRoute("/api/send-email");

http.route({
  path: "/api/auth/sign-up",
  method: "POST",
  handler: withErrorHandling(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runMutation(api.users.signUp, {
      email: body.email,
      passwordHash: body.passwordHash,
    });
    return json(200, result);
  }),
});

http.route({
  path: "/api/auth/sign-in",
  method: "POST",
  handler: withErrorHandling(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runMutation(api.users.signIn, {
      email: body.email,
      passwordHash: body.passwordHash,
    });
    return json(200, result);
  }),
});

http.route({
  path: "/api/auth/apple",
  method: "POST",
  handler: withErrorHandling(async (ctx, req) => {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email : undefined;
    const givenName = typeof body.givenName === "string" ? body.givenName : undefined;
    const familyName = typeof body.familyName === "string" ? body.familyName : undefined;

    const result = await ctx.runMutation(api.users.signInWithApple, {
      appleUserId: body.appleUserId,
      email,
      givenName,
      familyName,
    });
    return json(200, result);
  }),
});

http.route({
  path: "/api/auth/session",
  method: "GET",
  handler: withErrorHandling(async (ctx, req) => {
    const token = getTokenFromHeader(req);
    if (!token) {
      return json(401, { error: "Missing Authorization header." });
    }

    const result = await ctx.runQuery(api.users.getSession, { token });
    if (!result) {
      return json(401, { error: "Invalid session." });
    }

    return json(200, { session: result });
  }),
});

http.route({
  path: "/api/auth/sign-out",
  method: "POST",
  handler: withErrorHandling(async (ctx, req) => {
    const token = getTokenFromHeader(req);
    if (!token) {
      return json(200, { success: true });
    }

    await ctx.runMutation(api.users.signOut, { token });
    return json(200, { success: true });
  }),
});

http.route({
  path: "/api/account/delete",
  method: "POST",
  handler: withErrorHandling(async (ctx, req) => {
    const token = getTokenFromHeader(req);
    if (!token) {
      return json(401, { error: "Missing Authorization header." });
    }

    await ctx.runMutation(api.users.deleteAccount, { token });
    return json(200, { success: true });
  }),
});

http.route({
  path: "/api/state",
  method: "GET",
  handler: withErrorHandling(async (ctx, req) => {
    const token = getTokenFromHeader(req);
    if (!token) {
      return json(401, { error: "Missing Authorization header." });
    }

    const state = await ctx.runQuery(api.users.getState, { token });
    return json(200, { state });
  }),
});

http.route({
  path: "/api/state",
  method: "POST",
  handler: withErrorHandling(async (ctx, req) => {
    const token = getTokenFromHeader(req);
    if (!token) {
      return json(401, { error: "Missing Authorization header." });
    }

    const body = await req.json();

    await ctx.runMutation(api.users.saveState, {
      token,
      emailAccountsJson: body.emailAccountsJson,
      historyJson: body.historyJson,
      userProfileJson: body.userProfileJson,
      categoriesJson: body.categoriesJson,
      darkMode: body.darkMode,
    });

    return json(200, { success: true });
  }),
});

http.route({
  path: "/api/send-email",
  method: "POST",
  handler: withErrorHandling(async (ctx, req) => {
    const body = await req.json();

    const result = await ctx.runAction(api.email.sendEmail, {
      to: body.to,
      subject: body.subject,
      content: body.content,
      type: body.type,
      attachment: body.attachment,
    });

    return json(200, result);
  }),
});

export default http;
