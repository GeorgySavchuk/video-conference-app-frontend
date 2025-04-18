'use client'

import { Provider } from 'effector-react'
import { fork } from 'effector'
import { ReactNode, useMemo } from 'react'

export function EffectorProvider({ 
  children
}: {
  children: ReactNode
}) {
  const scope = useMemo(() => fork(), [])

  return <Provider value={scope}>{children}</Provider>
}