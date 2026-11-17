import { drik } from './drik';
import type { Engine, Method } from './engine';
import { suryaSiddhanta } from './surya-siddhanta';

/** Nepali patros are the reference for this community, so they are the default. */
export const DEFAULT_METHOD: Method = 'nepal-panchang';

const ENGINES: Record<Method, Engine> = {
  'nepal-panchang': suryaSiddhanta,
  drik
};

export function engineFor(method: Method = DEFAULT_METHOD): Engine {
  const engine = ENGINES[method] as Engine | undefined;
  if (!engine) throw new RangeError(`Unknown method "${method}"`);
  return engine;
}
