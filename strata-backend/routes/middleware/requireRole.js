/**
 * requireRole.js
 *
 * This middleware function enforces role-based access control for API routes.
 *
 * - Checks if the authenticated user has the required role.
 * - If not, it returns a 403 Forbidden response.
 * - Intended for use in Express.js or similar middleware-based frameworks.
 *
 * Usage:
 * Attach this middleware to any route that should be protected by user role.
 *
 * Example:
 * const { requireRole } = require('./requireRole');
 * app.get('/admin-only', requireRole('manager'), (req, res) => { ... });
 *
 * Assumptions:
 * - `req.user` must be populated before this middleware runs (e.g., via authentication middleware).
 * - User's role is stored in `user.user_metadata.role`.
 *
 * @param {string} role - The required role to access the route (e.g., 'manager', 'owner', 'tenant')
 * @returns {function} Express middleware function
 */

export function requireRole(role) {
  return (req, res, next) => {
    const user = req.user;

    // Check if user exists and has the required role
    if (!user || user.user_metadata?.role !== role) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }

    // Proceed to next middleware or route handler
    next();
  };
}
