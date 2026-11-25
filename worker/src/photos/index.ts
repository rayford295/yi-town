// The album Worker's entry: every request goes to handle.ts.
import { handle, type Env } from './handle';

export default { fetch: (req: Request, env: Env): Promise<Response> => handle(req, env) };
