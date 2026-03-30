import { notFound } from "next/navigation"
import FooterInfoPage from "@/components/landing/FooterInfoPage"
import { getFooterEntry, getFooterSectionEntries } from "@/lib/footer-pages"

type LegalPageProps = {
  params: {
    page: string
  }
}

export function generateStaticParams() {
  return getFooterSectionEntries("legal").map((entry) => ({ page: entry.slug }))
}

export default function LegalPage({ params }: LegalPageProps) {
  const entry = getFooterEntry("legal", params.page)

  if (!entry) {
    notFound()
  }

  return <FooterInfoPage section="legal" entry={entry} />
}
