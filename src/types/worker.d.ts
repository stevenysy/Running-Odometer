import type { Bindings } from './env';

declare global {
  type Env = Bindings;
}
