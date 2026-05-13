/**
 * 官方模板 Git： https://github.com/bytedance/douyincloud-nodejs-koa-demo （分支 main）
 *
 * 合并到该仓库的 src/server.ts：
 * 1. import { registerLoginRoute } from './login-route';
 * 2. 在 app.use(router.routes()) 之前执行 registerLoginRoute(router);
 * 3. 确保已有 bodyParser：app.use(bodyParser());
 *
 * 环境变量（抖音云容器配置）：APP_ID、APP_SECRET
 */
import axios from "axios";
import crypto from "crypto";

export function registerLoginRoute(router: any) {
  router.post("/api/login", async (ctx: any) => {
    const body = (ctx.request.body || {}) as { code?: string };
    const code = body.code;
    if (!code) {
      ctx.status = 400;
      ctx.body = { message: "missing code" };
      return;
    }

    const appid = process.env.APP_ID || process.env.DOUYIN_APP_ID;
    const secret = process.env.APP_SECRET || process.env.DOUYIN_APP_SECRET;
    if (!appid || !secret) {
      ctx.status = 500;
      ctx.body = { message: "server missing APP_ID / APP_SECRET in env" };
      return;
    }

    try {
      // v2 必须用 POST + JSON；用 GET 会 404，小程序端会看到 502 + axios 404 文案
      let payload: Record<string, unknown>;
      try {
        const resp = await axios.post(
          "https://developer.toutiao.com/api/apps/v2/jscode2session",
          { appid, secret, code },
          { timeout: 10000, headers: { "Content-Type": "application/json" } }
        );
        payload = resp.data as Record<string, unknown>;
      } catch {
        const resp = await axios.get("https://developer.toutiao.com/api/apps/jscode2session", {
          params: { appid, secret, code },
          timeout: 10000
        });
        payload = resp.data as Record<string, unknown>;
      }
      const errNo = payload.err_no as number | undefined;
      const tips = (payload.err_tips || payload.err_msg || "") as string;

      const dataBlock = (payload.data || {}) as Record<string, unknown>;
      const openid = (dataBlock.openid || payload.openid) as string | undefined;

      if (errNo !== undefined && errNo !== 0) {
        ctx.body = {
          message: tips || "code2session failed",
          err_no: errNo
        };
        return;
      }

      if (!openid) {
        ctx.body = { message: tips || "no openid in response", detail: payload };
        return;
      }

      const random = crypto.randomBytes(16).toString("hex");
      const token = crypto.createHash("sha256").update(`${openid}:${random}:${Date.now()}`).digest("hex");

      ctx.body = {
        token,
        userInfo: {
          openid,
          unionid: (dataBlock.unionid || "") as string
        }
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "upstream error";
      ctx.status = 502;
      ctx.body = { message: msg };
    }
  });
}
