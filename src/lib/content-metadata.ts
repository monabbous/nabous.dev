import type { Metadata } from "next";
import type { Post } from "./project-content";
import { assetUrl } from "./public-url";
import { siteIcons } from "../constants/site-icons";

export function articleSocialImage(post: Post) {
  const source = post.socialImage ?? post.cover;
  if (!source) return undefined;
  return { url: new URL(assetUrl(post.project.slug, source), "https://nabous.dev").href, alt: post.title,
    ...(post.socialImage ? { width: post.socialImageWidth, height: post.socialImageHeight } : {}),
  };
}

export function articleMetadata(post: Post): Metadata {
  const url = `https://nabous.dev/blog/${post.project.slug}/`;
  const image = articleSocialImage(post);
  const description = post.description || post.title;
  return { title: `${post.title} | Mohamed Nabous`, description,
    authors: [{ name: "Mohamed Nabous", url: "https://nabous.dev" }],
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { "max-image-preview": "large" } },
    icons: siteIcons,
    openGraph: { type: "article", siteName: "nabous.dev", url, title: post.title, description, authors: ["https://nabous.dev"],
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}), ...(image ? { images: [image] } : {}),
    },
    twitter: { card: "summary_large_image", title: post.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export function articleStructuredData(post: Post) {
  const url = `https://nabous.dev/blog/${post.project.slug}/`;
  return { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title,
    description: post.description || post.title, url, mainEntityOfPage: url,
    author: { "@type": "Person", name: "Mohamed Nabous", url: "https://nabous.dev" },
    image: articleSocialImage(post)?.url, ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
  };
}
