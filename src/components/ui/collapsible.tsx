"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  nativeButton,
  ...props
}: CollapsiblePrimitive.Trigger.Props & { nativeButton?: boolean }) {
  return (
    <CollapsiblePrimitive.Trigger 
      data-slot="collapsible-trigger" 
      nativeButton={nativeButton} 
      {...props} 
    />
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
