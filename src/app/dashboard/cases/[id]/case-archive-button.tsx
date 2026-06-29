'use client'

import { useState } from 'react'
import { Archive } from 'lucide-react'
import { ArchiveModal } from '@/features/cases/components/archive-modal'
import { archiveCaseAction } from '@/features/cases/actions/cases.actions'
import type { ArchiveCaseValues } from '@/features/cases/schemas/cases.schema'
import type { ActionResult } from '@/shared/types/action-result'

interface CaseArchiveButtonProps {
  caseId: string
  caseName: string
}

export function CaseArchiveButton({ caseId, caseName }: CaseArchiveButtonProps) {
  const [open, setOpen] = useState(false)

  async function handleArchive(data: ArchiveCaseValues): Promise<ActionResult<void>> {
    return archiveCaseAction(caseId, data)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border-destructive/30 text-destructive hover:bg-destructive/5 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm transition-colors"
      >
        <Archive className="size-4" />
        Archivar
      </button>

      {open && (
        <ArchiveModal caseName={caseName} action={handleArchive} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
