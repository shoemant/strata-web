"use client";

import { useParams } from "next/navigation";
import DocumentsBrowser from "@/components/documents/DocumentBrowser";
import { documentsCapabilities } from "@/components/documents/documentsCapabilities";

export default function OwnerDocumentsPage() {
  const { id } = useParams();
  const buildingId = Array.isArray(id) ? id[0] : id;

  return (
    <DocumentsBrowser
      buildingId={buildingId}
      capabilities={documentsCapabilities.owner}
    />
  );
}
