import { createApp } from './routes/app';

const app = createApp();

export default {
  fetch: app.fetch,
  scheduled(_event, _env, ctx) {
    ctx.waitUntil(runScheduledReconciliation());
  }
} satisfies ExportedHandler<Env>;

function runScheduledReconciliation(): Promise<void> {
  // Implemented with the scheduled reconciliation feature.
  return Promise.resolve();
}
