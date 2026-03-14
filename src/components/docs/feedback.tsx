"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Feedback() {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)

  return (
    <div className="mt-16 pt-8 border-t flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-slate-600">Was this page helpful?</p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          className={feedback === "up" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : ""}
          onClick={() => setFeedback("up")}
        >
          <ThumbsUp className="h-4 w-4 mr-2" /> Yes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={feedback === "down" ? "bg-rose-50 border-rose-200 text-rose-600" : ""}
          onClick={() => setFeedback("down")}
        >
          <ThumbsDown className="h-4 w-4 mr-2" /> No
        </Button>
      </div>
      {feedback && (
        <p className="text-xs text-muted-foreground animate-in fade-in duration-500">
          Thank you for your feedback! It helps us improve our documentation.
        </p>
      )}
    </div>
  )
}
