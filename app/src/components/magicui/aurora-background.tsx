"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface AuroraBackgroundProps {
  className?: string
  children: ReactNode
}

export function AuroraBackground({ className, children }: AuroraBackgroundProps) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div className="absolute -top-24 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.35),transparent_65%)] blur-3xl" />
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
            className="absolute -bottom-32 left-24 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.28),transparent_60%)] blur-3xl"
          />
          <motion.div
            animate={{
              rotate: [360, 0],
            }}
            transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
            className="absolute top-32 right-10 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.25),transparent_55%)] blur-3xl"
          />
        </motion.div>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
