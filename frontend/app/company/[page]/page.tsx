import { notFound } from "next/navigation"
import FooterInfoPage from "@/components/landing/FooterInfoPage"
import { getFooterEntry, getFooterSectionEntries } from "@/lib/footer-pages"

type CompanyPageProps = {
  params: {
    page: string
  }
}

export function generateStaticParams() {
  return getFooterSectionEntries("company").map((entry) => ({ page: entry.slug }))
}

export default function CompanyPage({ params }: CompanyPageProps) {
  const entry = getFooterEntry("company", params.page)

  if (!entry) {
    notFound()
  }

  return <FooterInfoPage section="company" entry={entry} />
}
