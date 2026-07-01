interface CampaignProgressBarProps {
  raisedAmountUsd: number
  goalAmountUsd: number
  progressPct: number
  showAmounts?: boolean
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount)
}

export function CampaignProgressBar({
  raisedAmountUsd,
  goalAmountUsd,
  progressPct,
  showAmounts = true,
}: CampaignProgressBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showAmounts && (
        <div className="flex items-center justify-between">
          <span className="text-foreground font-mono text-sm font-semibold">
            {formatUsd(raisedAmountUsd)}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {progressPct}% · meta {formatUsd(goalAmountUsd)}
          </span>
        </div>
      )}
    </div>
  )
}
