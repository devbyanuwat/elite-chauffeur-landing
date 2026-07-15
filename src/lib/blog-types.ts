export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  tags: string[];
  authorName: string | null;
}

export interface ArticleFull extends ArticleSummary {
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  locale: string;
  createdAt: string | null;
  updatedAt: string | null;
}
