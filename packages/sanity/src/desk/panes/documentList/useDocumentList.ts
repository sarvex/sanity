import {useEffect, useState, useCallback, useMemo, useRef} from 'react'
import {concat, of, filter as filterEvents} from 'rxjs'
import {DocumentListPaneItem, QueryResult, SortOrder} from './types'
import {removePublishedWithDrafts, toOrderClause} from './helpers'
import {DEFAULT_ORDERING, FULL_LIST_LIMIT, PARTIAL_PAGE_LIMIT} from './constants'
import {getQueryResults} from './getQueryResults'
import {DEFAULT_STUDIO_CLIENT_OPTIONS, FIXME, useClient} from 'sanity'

const EMPTY_ARRAY: [] = []

const INITIAL_STATE: QueryResult = {
  error: null,
  loading: true,
  onRetry: undefined,
  result: {
    documents: EMPTY_ARRAY,
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
  const items = useMemo(
    () => (documents ? removePublishedWithDrafts(documents) : EMPTY_ARRAY),
    [documents]
  )

  // A state variable to keep track of the current page index (used for determining the range of items to fetch).
  const [pageIndex, setPageIndex] = useState<number>(0)

  // A ref to keep track of whether we have fetched all the items or not.
  const hasFetchedAllItems = useRef<boolean>(false)
  // A boolean to keep track of whether we have fetched the maximum number of items or not.
  const hasMaxItems = items.length >= FULL_LIST_LIMIT
  // If we have fetched all the items or we have reached the maximum number of items,
  // we don't need to fetch more items.
  const hasFullList = hasMaxItems || hasFetchedAllItems.current

  // The query to fetch the documents for the list. It consists of:
  // - The filter (search, custom filter from structure builder, etc)
  // - The sort order (if any)
  // - The range (the number of items to fetch)
  const query = useMemo(() => {
    const extendedProjection = sortOrder?.extendedProjection
    const projectionFields = ['_id', '_type']
    const finalProjection = projectionFields.join(',')
    const sortBy = sortOrder?.by || EMPTY_ARRAY
    const sort = sortBy.length > 0 ? sortBy : DEFAULT_ORDERING.by
    const order = toOrderClause(sort)

    const start = pageIndex * PARTIAL_PAGE_LIMIT
    const end = start + PARTIAL_PAGE_LIMIT
    const range = `[${start}...${end}]`

    if (extendedProjection) {
      const firstProjection = projectionFields.concat(extendedProjection).join(',')
      return [
        `*[${filter}] {${firstProjection}}`,
        `order(${order}) ${range}`,
        `{${finalProjection}}`,
      ].join('|')
    }

    return `*[${filter}]|order(${order})${range}{${finalProjection}}`
  }, [sortOrder?.extendedProjection, sortOrder?.by, filter, pageIndex])

  const handleListChange = useCallback(() => {
    if (isLoading || hasFullList) return

    // Increment the page variable to fetch the next set of items
    setPageIndex((v) => v + 1)
  }, [hasFullList, isLoading])

  const handleSetResult = useCallback(
    (res: QueryResult) => {
      const isLoadingMoreItems = res?.result?.documents?.length === 0 && pageIndex > 1

      // If the result is empty and the page is greater than 1, it means that we are
      // loading more items. In that case, we don't want to set the result to the state
      // with no documents, but rather keep the current result and set the loading state
      // to true.
      if (isLoadingMoreItems) {
        setResult((prev) => ({...prev, loading: true}))
        return
      }

      // If the result is less than the limit of the partial page, it means that we have
      // fetched all the items.
      hasFetchedAllItems.current = res.result.documents.length < PARTIAL_PAGE_LIMIT

      setResult((current) => ({
        ...res,
        result: {
          // Concatenate the current documents with the new documents
          documents: [
            ...(current?.result?.documents || EMPTY_ARRAY),
            ...(res?.result?.documents || EMPTY_ARRAY),
          ],
        },
      }))
    },
    [pageIndex]
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
    setPageIndex(0)
  }, [filter, params, sortOrder, apiVersion])

  return {
    error,
    handleListChange,
    hasMaxItems,
    isLoading,
    items,
    onRetry,
  }
}
