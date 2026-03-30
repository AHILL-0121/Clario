import { notFound } from "next/navigation"
import FooterInfoPage from "@/components/landing/FooterInfoPage"
import { getFooterEntry, getFooterSectionEntries } from "@/lib/footer-pages"

type ProductPageProps = {
  params: {
    page: string
  }
}

export function generateStaticParams() {
  return getFooterSectionEntries("product").map((entry) => ({ page: entry.slug }))
}

export default function ProductPage({ params }: ProductPageProps) {
  const entry = getFooterEntry("product", params.page)

  if (!entry) {
    notFound()
  }

  return <FooterInfoPage section="product" entry={entry} />
}
