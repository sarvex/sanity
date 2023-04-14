import {useEffect, useState, useCallback, useMemo} from 'react'
import {concat, of, filter as filterEvents} from 'rxjs'
import {DocumentListPaneItem, QueryResult, SortOrder} from './types'
import {removePublishedWithDrafts, toOrderClause} from './helpers'
import {DEFAULT_ORDERING, FULL_LIST_LIMIT, PARTIAL_PAGE_LIMIT} from './constants'
import {getQueryResults} from './getQueryResults'
import {useDocumentTypeCount} from './hooks'
import {DEFAULT_STUDIO_CLIENT_OPTIONS, FIXME, useClient} from 'sanity'

const INITIAL_STATE: QueryResult = {
  error: null,
  loading: true,
  onRetry: undefined,
  result: {
    documents: [],
  },
}

interface UseDocumentListOpts {
  filter: string
  params: Record<string, unknown>
  sortOrder?: SortOrder
  apiVersion?: string
}

interface DocumentListState {
  error: {message: string} | null
  handleListChange: () => void
  hasMaxItems?: boolean
  isLoading: boolean
  items: DocumentListPaneItem[]
  onRetry?: (event: unknown) => void
}

/**
 * @internal
 */
export function useDocumentList(opts: UseDocumentListOpts): DocumentListState {
  const {apiVersion, filter, params, sortOrder} = opts
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS)
  const [result, setResult] = useState<QueryResult>(INITIAL_STATE)
  const error = result?.error || null
  const isLoading = result?.loading || result === null
  const onRetry = result?.onRetry
  const documents = result?.result?.documents
  const items = useMemo(() => (documents ? removePublishedWithDrafts(documents) : []), [documents])

  const [page, setPage] = useState(1)

  const documentCount = useDocumentTypeCount({params, filter})
  const count = documentCount?.data?.count || 0
  const countLoading = documentCount?.loading || false

  // The list if full when:
  // - The number of items is equal to the total number of documents of the given type
  // - The number of items is equal to the limit of the full list
  const hasMaxItems = items.length >= FULL_LIST_LIMIT
  const hasAllItems = items.length === count
  const hasFullList = hasMaxItems || hasAllItems

  // The range of items to fetch.
  // The page variable increments when the user scrolls to the bottom of the list.
  const range = `[0...${page * PARTIAL_PAGE_LIMIT}]`

  // The query to fetch the documents for the list. It consists of:
  // - The filter (search, custom filter from structure builder, etc)
  // - The sort order (if any)
  // - The range (the number of items to fetch)
  const query = useMemo(() => {
    const extendedProjection = sortOrder?.extendedProjection
    const projectionFields = ['_id', '_type']
    const finalProjection = projectionFields.join(',')
    const sortBy = sortOrder?.by || []
    const sort = sortBy.length > 0 ? sortBy : DEFAULT_ORDERING.by
    const order = toOrderClause(sort)

    if (extendedProjection) {
      const firstProjection = projectionFields.concat(extendedProjection).join(',')
      return [
        `*[${filter}] {${firstProjection}}`,
        `order(${order}) ${range}`,
        `{${finalProjection}}`,
      ].join('|')
    }

    return `*[${filter}]|order(${order})${range}{${finalProjection}}`
  }, [sortOrder?.extendedProjection, sortOrder?.by, filter, range])

  const handleListChange = useCallback(() => {
    if (isLoading || hasFullList) return

    // Increment the page variable to fetch the next set of items
    setPage((v) => v + 1)
  }, [hasFullList, isLoading])

  const handleSetResult = useCallback(
    (res: QueryResult) => {
      const isLoadingMoreItems = res?.result?.documents?.length === 0 && page > 1

      // If the result is empty and the page is greater than 1, it means that
      // we are loading more items. In this case, we don't want to set the result
      // to the empty value, but rather keep the previous result and set the
      // loading state to true and wait for the next result (i.e the fetched items)
      if (isLoadingMoreItems) {
        setResult((prev) => ({...prev, loading: true}))
        return
      }

      setResult(res)
    },
    [page]
  )

  // Set up the document list listener
  useEffect(() => {
    // @todo: explain what this does
    const filterFn = (queryResult: QueryResult) => Boolean(queryResult.result)

    const queryResults$ = getQueryResults(of({client, query, params}), {
      apiVersion,
      tag: 'desk.document-list',
    }).pipe(filterEvents(filterFn as FIXME))

    const initial$ = of(INITIAL_STATE)
    const state$ = concat(initial$, queryResults$)
    const sub = state$.subscribe(handleSetResult as FIXME)

    return () => {
      sub.unsubscribe()
    }
  }, [apiVersion, client, query, params, handleSetResult])

  // If `filter` or `params` changed, set up a new query from scratch.
  // If `sortOrder` changed, set up a new query from scratch as well.
  useEffect(() => {
    setResult(INITIAL_STATE)
    setPage(1)
  }, [filter, params, sortOrder, apiVersion])

  return {
    error,
    handleListChange,
    hasMaxItems,
    isLoading: isLoading || countLoading,
    items,
    onRetry,
  }
}
