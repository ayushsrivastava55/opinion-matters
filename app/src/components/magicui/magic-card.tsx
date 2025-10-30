"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface MagicCardProps {
  children: ReactNode
  className?: string
  borderClassName?: string
}

export function MagicCard({ children, className, borderClassName }: MagicCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className={cn("group relative rounded-2xl bg-white/5 p-[1px]", className)}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 via-blue-500/20 to-cyan-400/25 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100",
          borderClassName
        )}
      />
      <div className="relative rounded-[1.1rem] border border-white/10 bg-black/60 backdrop-blur-xl p-6">
        {children}
      </div>
    </motion.div>
  )
}
