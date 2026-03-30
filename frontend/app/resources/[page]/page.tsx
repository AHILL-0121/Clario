import { notFound } from "next/navigation"
import FooterInfoPage from "@/components/landing/FooterInfoPage"
import { getFooterEntry, getFooterSectionEntries } from "@/lib/footer-pages"

type ResourcesPageProps = {
  params: {
    page: string
  }
}

export function generateStaticParams() {
  return getFooterSectionEntries("resources").map((entry) => ({ page: entry.slug }))
}

export default function ResourcesPage({ params }: ResourcesPageProps) {
  const entry = getFooterEntry("resources", params.page)

  if (!entry) {
    notFound()
  }

  return <FooterInfoPage section="resources" entry={entry} />
}
