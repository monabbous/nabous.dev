type MarkdownNode = {
  type: string;
  value?: string;
  alt?: string;
  children?: MarkdownNode[];
  data?: { hProperties?: { id?: string } };
};

function headingText(node: MarkdownNode): string {
  if (node.value !== undefined) return node.value;
  if (node.alt !== undefined) return node.alt;
  return node.children?.map(headingText).join("") ?? "";
}

export function headingSlug(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-") || "section";
}

// Run on the parsed Markdown tree, not a second regex parse of its source.
// IDs are article-scoped and deterministic, including duplicate headings.
export function remarkHeadingIds() {
  return (tree: MarkdownNode) => {
    const used = new Set<string>();
    function visit(node: MarkdownNode) {
      if (node.type === "heading") {
        const base = headingSlug(headingText(node));
        let id = base;
        let suffix = 1;
        while (used.has(id)) id = `${base}-${suffix++}`;
        used.add(id);
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties.id = id;
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
