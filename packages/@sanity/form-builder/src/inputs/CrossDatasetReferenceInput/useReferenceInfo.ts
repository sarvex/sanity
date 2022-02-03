import {useCallback, useState} from 'react'
import {catchError, concatMap, map, startWith} from 'rxjs/operators'
import {Observable, of} from 'rxjs'
import {useMemoObservable} from 'react-rx'
import {usePrevious} from '../../hooks/usePrevious'
import {CrossDatasetReferenceInfo} from './types'

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

const INITIAL_LOADING_STATE: Loadable<CrossDatasetReferenceInfo> = {
  isLoading: true,
  result: undefined,
  error: undefined,
  retry: noop,
}

const EMPTY_STATE: Loadable<any> = {
  isLoading: false,
  result: undefined,
  error: undefined,
  retry: noop,
}

export type Loadable<T> =
  | {isLoading: true; result: undefined; error: undefined; retry: () => void}
  | {isLoading: false; result: T; error: undefined; retry: () => void}
  | {isLoading: false; result: undefined; error: Error; retry: () => void}

type GetReferenceInfo = (id: string) => Observable<CrossDatasetReferenceInfo>

export function useReferenceInfo(
  id: string | undefined,
  getReferenceInfo: GetReferenceInfo
): Loadable<CrossDatasetReferenceInfo> {
  const [retryAttempt, setRetryAttempt] = useState<number>(0)

  const retry = useCallback(() => {
    setRetryAttempt((current) => current + 1)
  }, [])

  const referenceInfo = useMemoObservable(
    () =>
      of(id).pipe(
        concatMap((refId: string | undefined) =>
          refId
            ? getReferenceInfo(refId).pipe(
                map(
                  (result) =>
                    ({
                      isLoading: false,
                      result,
                      error: undefined,
                      retry,
                    } as const)
                ),
                startWith(INITIAL_LOADING_STATE),
                catchError((err: Error) => {
                  console.error(err)
                  return of({isLoading: false, result: undefined, error: err, retry} as const)
                })
              )
            : of(EMPTY_STATE)
        )
      ),
    [retryAttempt, getReferenceInfo, id, retry],
    INITIAL_LOADING_STATE
  )

  // workaround for a "bug" with useMemoObservable that doesn't
  // return the initial value upon resubscription
  const previousId = usePrevious(id, id)
  if (previousId !== id) {
    return INITIAL_LOADING_STATE
  }
  return referenceInfo
}