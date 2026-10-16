/**
 * Single source of truth for the password rule. Used by the request
 * validators (register / reset / change password) and the User schema, so the
 * API can never accept a password the frontend form would reject -- or the
 * other way round. The frontend's set-password form mirrors this value.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LENGTH_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
