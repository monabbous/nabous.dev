export function assetUrl(slug: string, source: string): string {
  if (/^(https?:|mailto:|#|\/)/i.test(source)) return source;
  return `/project-assets/${slug}/${source.replace(/^\.\//, "")}`;
}
