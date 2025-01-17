import {useContext} from 'react'
import {empty} from 'rxjs'
import {useMemoObservable} from 'react-rx'
import {UserColorManagerContext} from './context'
import {UserColor, UserColorManager} from './types'

/** @internal */
export function useUserColorManager(): UserColorManager {
  const userColorManager = useContext(UserColorManagerContext)

  if (!userColorManager) {
    throw new Error('UserColorManager: missing context value')
  }

  return userColorManager
}

/** @internal */
export function useUserColor(userId: string | null): UserColor {
  const manager = useUserColorManager()

  return useMemoObservable(userId ? manager.listen(userId) : empty(), [userId], manager.get(null))
}
