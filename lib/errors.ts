// Supabase/PostgREST can throw plain objects rather than Error instances.
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error &&
      typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return 'Unknown error';
}
