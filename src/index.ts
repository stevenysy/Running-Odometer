import { createApp } from './routes/app';

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduledReconciliation(env));
  }
} satisfies ExportedHandler<Env>;

async function runScheduledReconciliation(_env: Env): Promise<void> {
  // Implemented with the scheduled reconciliation feature.
}
