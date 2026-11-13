"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function fitToContent(el: HTMLTextAreaElement) {
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`
}

/**
 * Textarea with the same look as `Input`. With `autoGrow`, its height follows
 * the content (recomputed whenever `value` changes, not only on typing, so it
 * also fits when a form is reset or prefilled).
 */
function Textarea({
  className,
  autoGrow = false,
  value,
  ref,
  ...props
}: React.ComponentProps<"textarea"> & { autoGrow?: boolean }) {
  const innerRef = React.useRef<HTMLTextAreaElement>(null)

  React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)

  React.useLayoutEffect(() => {
    const el = innerRef.current
    if (!autoGrow || !el) return
    fitToContent(el)
  }, [autoGrow, value])

  // Re-fit when the width changes (rotation, window resize, scrollbar
  // appearing); otherwise text wrapped onto more lines would be cut off.
  React.useEffect(() => {
    const el = innerRef.current
    if (!autoGrow || !el || typeof ResizeObserver === "undefined") return
    let lastWidth = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return
      lastWidth = el.clientWidth
      fitToContent(el)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [autoGrow])

  return (
    <textarea
      ref={innerRef}
      data-slot="textarea"
      value={value}
      className={cn(
        "min-h-16 w-full min-w-0 resize-none rounded-xl border border-border/80 bg-card px-3 py-2 text-[15px] leading-snug shadow-apple-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        autoGrow && "overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
