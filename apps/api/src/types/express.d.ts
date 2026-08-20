import type { AuthUser } from '../common/guards/jwt-auth.guard';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
