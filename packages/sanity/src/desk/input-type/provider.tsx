import React, {useCallback, useEffect, useState} from 'react'
import {InputTypeContext} from './context'
import {InputType} from './types'

interface InputTypeProviderProps {
  children: React.ReactNode
}

// Limit the amount of elements we add listeners to avoid unnecessary re-renders
const QUERY_SELECTORS = ['[data-ui="DocumentListPane"]', '[data-ui="ListPane"]']

export function InputTypeProvider(props: InputTypeProviderProps) {
  const {children} = props
  const [inputType, setInputType] = useState<InputType>('initial')

  // This should not be memoized, as we want to re-run the effect when the list of elements change
  const listenerElements = document.querySelectorAll(QUERY_SELECTORS.join(', '))

  const handlePointerDown = useCallback(() => setInputType('mouse'), [])
  const handleKeyDown = useCallback(() => setInputType('keyboard'), [])
  const handleTouchStart = useCallback(() => setInputType('touch'), [])

  useEffect(() => {
    listenerElements.forEach((element) => {
      element.addEventListener('keydown', handleKeyDown, true)
      element.addEventListener('pointerdown', handlePointerDown, true)
      element.addEventListener('touchstart', handleTouchStart, true)
    })

    return () => {
      listenerElements.forEach((element) => {
        element.removeEventListener('keydown', handleKeyDown, true)
        element.removeEventListener('pointerdown', handlePointerDown, true)
        element.removeEventListener('touchstart', handleTouchStart, true)
      })
    }
  }, [handleKeyDown, handlePointerDown, handleTouchStart, listenerElements])

  return <InputTypeContext.Provider value={inputType}>{children}</InputTypeContext.Provider>
}
