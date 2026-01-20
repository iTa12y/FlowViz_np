export function createPageUrl(pageName) {
  if (!pageName) return "/";
  let cleaned = pageName.trim();
  cleaned = cleaned.replace(/^[/#]+/, "");
  cleaned = cleaned.replace(/}+$/, "");
  return `/${cleaned}`;
}
