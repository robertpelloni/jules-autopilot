"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
<<<<<<< HEAD
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels"
=======
// Note: react-resizable-panels export names can vary by build/environment.
// Node check confirmed exports are Group, Panel, Separator.
import { Panel, Group, Separator } from "react-resizable-panels"
>>>>>>> cca362fe49a84150efc5a322c7a17148c86140f9

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup>) => {
  return (
<<<<<<< HEAD
    <PanelGroup
=======
    <GroupAny
      direction={direction}
>>>>>>> cca362fe49a84150efc5a322c7a17148c86140f9
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean
}) => {
  return (
<<<<<<< HEAD
    <PanelResizeHandle
=======
    <Separator
>>>>>>> cca362fe49a84150efc5a322c7a17148c86140f9
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
