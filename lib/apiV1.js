import { getRequestUser } from './requestUser';

// Wraps /api/v1 handlers: resolves the caller (app bearer token or website
// session) and turns thrown ApiErrors into JSON. Kept stable and versioned so
// other clients (e.g. suited.social, via account linking) can use it later.
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function v1(handler, { auth = 'member' } = {}) {
  return async (request, context) => {
    try {
      const user = await getRequestUser(request);
      if (auth !== 'public' && !user) throw new ApiError('Not signed in.', 401);
      if (auth === 'admin' && user.role !== 'ADMIN') throw new ApiError('Admins only.', 403);
      const result = await handler({ request, params: context?.params || {}, user });
      if (result instanceof Response) return result;
      return Response.json(result ?? { ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      const status = error.status || (error.name === 'ZodError' ? 400 : 500);
      if (status >= 500) console.error('API v1 error:', error);
      const message =
        error.name === 'ZodError' ? error.issues?.[0]?.message : status >= 500 ? 'Something went wrong.' : error.message;
      return Response.json({ error: message }, { status });
    }
  };
}
