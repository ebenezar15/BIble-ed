/** The site's path prefix when it is served from a sub-folder (GitHub Pages serves it at /<repo>). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** For raw <a href> in HTML strings; next/link adds the base path itself. */
export const withBase = (href: string) => (href.startsWith("/") ? `${BASE_PATH}${href}` : href);

export const verseHref = (osis: string) => `/verse/?ref=${encodeURIComponent(osis)}`;
export const wordHref = (id: string) => `/word/?id=${encodeURIComponent(id)}`;
export const nameHref = (id: string) => `/name/?id=${encodeURIComponent(id)}`;
export const searchHref = (q: string) => `/search/?q=${encodeURIComponent(q)}`;
export const editHref = (subject: string) => `/edit/?subject=${encodeURIComponent(subject)}`;
