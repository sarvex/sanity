import {useState, useEffect} from 'react'
import {Observable, catchError, concat, map, of, tap} from 'rxjs'
import {DEFAULT_STUDIO_CLIENT_OPTIONS, useClient} from 'sanity'

export interface Loadable<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export interface FetchProps {
  filter: string
  params: Record<string, unknown>
}

const INITIAL_STATE = {loading: true, data: null, error: null}

/**
 * @internal
 * Returns the number of documents of a given type
 */
export function useFetch<T>(props: FetchProps): Loadable<T> {
  const {filter, params} = props
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS)
  const [state, setState] = useState<Loadable<T>>(INITIAL_STATE)

  useEffect(() => {
    const count$: Observable<Loadable<T>> = client.observable.fetch(filter, params).pipe(
      map((res) => ({loading: false, data: res, error: null})),
      catchError((err) => of({loading: false, data: null, error: err}))
    )

    const initial$ = of(INITIAL_STATE)
    const state$ = concat(initial$, count$)
    const sub = state$.pipe(tap(setState)).subscribe()

    return () => {
      sub.unsubscribe()
    }
  }, [client, client.observable, filter, params])

  return state
}
