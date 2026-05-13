/**
 * 用本文件整体替换 douyin-travel-cloud 的 src/server.ts
 * 原因：官方 main 默认连 Redis + Mongo，环境变量不齐会启动即崩。
 * 本版只保留 Koa + /api/get_open_id + /api/login（旅行小程序够用）
 */
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { registerLoginRoute } from "./login-route";

const app = new Koa();
const router = new Router();

router
  .get("/", (ctx) => {
    ctx.body = "douyin travel cloud ok";
  })
  .get("/api/get_open_id", async (ctx) => {
    const value = ctx.get("x-tt-openid");
    if (value) {
      ctx.body = { success: true, data: value };
    } else {
      ctx.body = { success: false, message: "dyc-open-id not exist" };
    }
  });

registerLoginRoute(router);

app.use(bodyParser());
app.use(router.routes());

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
