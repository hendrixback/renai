import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ComingSoonPanel({
  title,
  description,
  examples,
}: {
  title: string
  description: string
  examples: string[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            What this will track
          </p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {examples.map((e) => (
              <li key={e} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                {e}
              </li>
            ))}
          </ul>
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          Coming in the next iteration. Ping us via{" "}
          <span className="font-medium text-foreground">Contact RenAI</span>{" "}
          if you need this prioritised.
        </p>
      </CardContent>
    </Card>
  )
}
