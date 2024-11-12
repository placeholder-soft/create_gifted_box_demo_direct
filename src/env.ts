import { createEnv } from "@t3-oss/env-nextjs";
import memoizee from "memoizee";
import { z } from "zod";

export const env = memoizee(() =>
  createEnv({
    server: {
      api_url: z.string().default("https://rest-api-staging.gifted.art"),
      api_key: z.string(),
      private_key: z.string(),
    },
    runtimeEnv: process.env as any,
  })
);
