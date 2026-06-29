'use client'

import { useFieldArray, type Control, type FieldErrors } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import type { CreateOrUpdateCaseValues } from '../schemas/cases.schema'

interface PhoneFieldArrayProps {
  control: Control<CreateOrUpdateCaseValues>
  errors: FieldErrors<CreateOrUpdateCaseValues>
}

export function PhoneFieldArray({ control, errors }: PhoneFieldArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'phones' })

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => {
        const phoneErrors = errors.phones?.[index]
        return (
          <div
            key={field.id}
            className="bg-muted/40 border-border flex flex-col gap-2 rounded-xl border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm font-medium">Teléfono {index + 1}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg p-1.5 transition-colors"
                aria-label="Eliminar teléfono"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Número <span className="text-destructive">*</span>
                </label>
                <input
                  {...control.register(`phones.${index}.phone`)}
                  type="tel"
                  placeholder="04121234567"
                  className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
                />
                {phoneErrors?.phone && (
                  <p className="text-destructive text-xs">{phoneErrors.phone.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Etiqueta (opcional)
                </label>
                <input
                  {...control.register(`phones.${index}.label`)}
                  type="text"
                  placeholder="WhatsApp, llamadas…"
                  className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                />
              </div>
            </div>

            <label className="text-foreground flex cursor-pointer items-center gap-2 text-sm">
              <input
                {...control.register(`phones.${index}.isPrimary`)}
                type="checkbox"
                className="border-input accent-primary rounded"
              />
              Teléfono principal
            </label>
          </div>
        )
      })}

      {(errors.phones as { message?: string } | undefined)?.message && (
        <p className="text-destructive text-xs">
          {(errors.phones as { message?: string }).message}
        </p>
      )}

      <button
        type="button"
        onClick={() => append({ phone: '', label: '', isPrimary: fields.length === 0 })}
        className="text-primary flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <Plus className="size-4" />
        Agregar teléfono
      </button>
    </div>
  )
}
