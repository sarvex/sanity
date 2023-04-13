import {useMemo} from 'react'
import {FetchProps, Loadable, useFetch} from './useFetch'

type Value = {count: number} | null

/**
 * @internal
 * Returns the number of documents of a given type
 */
export function useDocumentTypeCount(props: FetchProps): Loadable<Value> {
  const {params, filter: filterProp} = props

  const filter = useMemo(() => {
    return `
    {
      'drafts': *[ ${filterProp} && _id in path("drafts.**") ]._id,
      'published': *[ ${filterProp} && !(_id in path("drafts.**"))]._id,
    }
    {
      'count': count(published[ !("drafts." + @ in ^.drafts) ] + drafts)
    }`
  }, [filterProp])

  const value = useFetch<Value>({filter, params})

  return value
}
