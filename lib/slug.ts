/**
 * Slug generation, normalization, and validation for public document publishing (/p/[slug]).
 */

/**
 * List of reserved URL slugs and system paths that cannot be used as document slugs.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Core routes & system paths
  'api',
  'admin',
  'administrator',
  'auth',
  'authentication',
  'login',
  'signin',
  'logout',
  'signout',
  'signup',
  'register',
  'dashboard',
  'settings',
  'profile',
  'account',
  'billing',
  'subscription',

  // Sharing & public routes
  'p',
  'share',
  'shared',
  'invite',
  'invites',
  'public',
  'embed',
  'raw',
  'download',
  'export',

  // Static assets & system files
  'static',
  '_next',
  'favicon',
  'favicon.ico',
  'manifest',
  'manifest.json',
  'robots',
  'robots.txt',
  'sitemap',
  'sitemap.xml',
  'assets',
  'images',
  'fonts',
  'css',
  'js',

  // Organization & workspace
  'workspaces',
  'workspace',
  'projects',
  'project',
  'teams',
  'team',
  'org',
  'orgs',
  'organizations',
  'users',
  'user',

  // Marketing & documentation
  'docs',
  'documentation',
  'pricing',
  'help',
  'support',
  'terms',
  'terms-of-service',
  'privacy',
  'privacy-policy',
  'legal',
  'about',
  'about-us',
  'contact',
  'contact-us',
  'blog',
  'status',
  'features',

  // Generic & error routes
  'app',
  'home',
  'index',
  'root',
  'new',
  'edit',
  'create',
  'delete',
  '404',
  '500',
  'error',
  'undefined',
  'null',
]);

/**
 * Validates slug format:
 * - 3 to 80 chars
 * - lowercase letters, numbers, and hyphens only
 * - cannot start or end with hyphen
 * - cannot contain consecutive hyphens
 * Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
 */
export function isValidSlug(slug: string): boolean {
  if (typeof slug !== 'string') {
    return false;
  }
  if (slug.length < 3 || slug.length > 80) {
    return false;
  }
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Checks if a slug matches any reserved system route or keyword.
 */
export function isReservedSlug(slug: string): boolean {
  if (typeof slug !== 'string') {
    return false;
  }
  return RESERVED_SLUGS.has(slug.toLowerCase().trim());
}

/**
 * Converts document title into URL-friendly slug:
 * - lowercase
 * - ascii transliteration (diacritics stripped, common ligatures expanded)
 * - replaces spaces and special characters with hyphens
 * - collapses multiple hyphens
 * - trims leading and trailing hyphens
 * - maximum length 60 characters
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let slug = text
    .replace(/[\u00e4\u00c4]/g, 'ae')
    .replace(/[\u00f6\u00d6]/g, 'oe')
    .replace(/[\u00fc\u00dc]/g, 'ue')
    .replace(/[\u00df]/g, 'ss')
    .replace(/[\u00e6\u00c6]/g, 'ae')
    .replace(/[\u00f8\u00d8]/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip remaining combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')     // replace spaces/special chars with hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens

  if (slug.length > 60) {
    slug = slug.slice(0, 60).replace(/-+$/, '');
  }

  return slug;
}

/**
 * Generates a random alphanumeric suffix containing lowercase letters and digits.
 */
export function generateSlugSuffix(length: number = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}

/**
 * Generates a unique, valid slug for a document.
 * If the slugified base text is reserved, taken by an existing slug, or invalid (e.g. too short),
 * appends a random 4-character alphanumeric suffix: `${baseSlug}-${suffix}`.
 */
export function generateUniqueSlug(
  baseText: string,
  existingSlugs?: string[] | Set<string> | Iterable<string>
): string {
  let baseSlug = slugify(baseText);

  // If baseSlug is empty, use 'document' as default
  if (!baseSlug) {
    baseSlug = 'document';
  }

  // Ensure baseSlug does not exceed 75 characters so suffix fits within 80 char limit
  if (baseSlug.length > 75) {
    baseSlug = baseSlug.slice(0, 75).replace(/-+$/, '');
  }

  const takenSet = new Set<string>();
  if (existingSlugs) {
    for (const item of existingSlugs) {
      if (typeof item === 'string') {
        takenSet.add(item.toLowerCase().trim());
      }
    }
  }

  const isTaken = (s: string) => takenSet.has(s.toLowerCase());

  // If baseSlug is already valid, not reserved, and not taken, use it directly
  if (isValidSlug(baseSlug) && !isReservedSlug(baseSlug) && !isTaken(baseSlug)) {
    return baseSlug;
  }

  // Otherwise, append a random 4-character alphanumeric suffix
  let candidate = '';
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const suffix = generateSlugSuffix(4);
    candidate = `${baseSlug}-${suffix}`;
    attempts++;
  } while (
    (!isValidSlug(candidate) || isReservedSlug(candidate) || isTaken(candidate)) &&
    attempts < maxAttempts
  );

  // In the improbable event of collisions after 100 attempts, increase suffix length
  if (!isValidSlug(candidate) || isReservedSlug(candidate) || isTaken(candidate)) {
    candidate = `${baseSlug}-${generateSlugSuffix(8)}`;
  }

  return candidate;
}
