import {useEffect, useState, useCallback, useMemo, useRef} from 'react'
import {concat, of, filter as filterEvents} from 'rxjs'
import {DocumentListPaneItem, QueryResult, SortOrder} from './types'
import {removePublishedWithDrafts} from './helpers'
import {FULL_LIST_LIMIT, PARTIAL_PAGE_LIMIT} from './constants'
import {getQueryResults} from './getQueryResults'
import {createDocumentListQuery} from './createDocumentListQuery'
import {useDocumentTypeNames} from './hooks'
import {DEFAULT_STUDIO_CLIENT_OPTIONS, FIXME, useClient, useSchema} from 'sanity'

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
  searchQuery: string | null
}

interface DocumentListState {
  error: {message: string} | null
  onListChange: () => void
  hasMaxItems?: boolean
  isLoading: boolean
  items: DocumentListPaneItem[]
  onRetry?: (event: unknown) => void
  searchReady: boolean
}

/**
 * @internal
 */
export function useDocumentList(opts: UseDocumentListOpts): DocumentListState {
  const {apiVersion, filter, params, sortOrder, searchQuery} = opts
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS)
  const schema = useSchema()

  const [result, setResult] = useState<QueryResult>(INITIAL_STATE)
  const error = result?.error || null
  const isLoading = result?.loading || result === null
  const onRetry = result?.onRetry
  const documents = result?.result?.documents

  // Remove published documents that have a corresponding draft document.
  const items = useMemo(
    () => (documents ? removePublishedWithDrafts(documents) : EMPTY_ARRAY),
    [documents]
  )

  // A state variable to keep track of the current page index (used for determining the range of items to fetch).
  // Note: the pageIndex currently only has two values: 0 and 1. This is because the document list is fetched in two batches:
  // 1. The first batch is the partial page (the one that is visible when the pane is first opened).
  // 2. The second batch is the full page (the one that is visible when the user scrolls to the bottom of the list).
  // In future iterations, we may want to introduce more pages to allow for lazy loading of the list, and not just the first two pages.
  const [pageIndex, setPageIndex] = useState<number>(0)

  // A flag to indicate whether we have reached the limit of the number of items we want to display in the list
  const hasMaxItems = documents.length === FULL_LIST_LIMIT

  // A ref to keep track of whether we have fetched the full list of documents.
  const fullList = useRef<boolean>(false)

  // A flag to indicate whether we should disable lazy loading
  const disableLazyLoading = pageIndex > 0

  // Fetch the names of all document types that match the filter and params.
  // This allows us to search for documents of all types.
  const {data: documentTypeNames, loading: loadingDocumentTypeNames} = useDocumentTypeNames({
    filter,
    params,
  })

  // Extract the preview title field for each document type and memoize the result.
  // This is necessary because we want the search logic to search for what's visible in the list.
  const searchFields: string[] = useMemo(() => {
    // If the document type names haven't loaded yet or if there are no document types, return an empty array.
    if (!documentTypeNames) return EMPTY_ARRAY

    // Extract the preview title field for each document type (that is, the visible title in the list)
    return documentTypeNames
      .map((name) => schema.get(name)?.preview?.select?.title)
      .filter(Boolean) as string[]
  }, [documentTypeNames, schema])

  // Construct the query to fetch the documents
  const query = useMemo(() => {
    const range = pageIndex === 0 ? `[0...${PARTIAL_PAGE_LIMIT}]` : `[0...${FULL_LIST_LIMIT}]`

    return createDocumentListQuery({
      filter,
      range,
      searchFields,
      searchQuery,
      sortOrder,
    })
  }, [filter, pageIndex, searchFields, searchQuery, sortOrder])

  const onListChange = useCallback(() => {
    if (isLoading || disableLazyLoading || fullList.current) return

    // Increment the page variable to fetch the next set of items
    setPageIndex((v) => v + 1)
  }, [disableLazyLoading, isLoading])

  const handleSetResult = useCallback((res: QueryResult) => {
    const isLoadingMoreItems = res?.result?.documents?.length === 0 && fullList.current === false

    // The stream emits an empty result when it's loading more items.
    // We don't want to set the result to an empty array in this case.
    // Instead, we set the loading state to true and wait for the next result.
    if (isLoadingMoreItems) {
      setResult((prev) => ({...prev, loading: true}))
      return
    }

    // If the response contains less than the partial page limit, we know that
    // we have fetched all available documents and can set the fullList flag to true
    // to prevent further requests.
    if (res?.result?.documents?.length < PARTIAL_PAGE_LIMIT) {
      fullList.current = true
    }

    setResult(res)
  }, [])

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

  // Reset the result and page index when the filter, params, sort order or search query changes.
  useEffect(() => {
    setResult(INITIAL_STATE)
    setPageIndex(0)
    fullList.current = false
  }, [filter, params, sortOrder, searchQuery])

  return {
    error,
    onListChange,
    hasMaxItems,
    isLoading: isLoading || loadingDocumentTypeNames,
    items,
    onRetry,
    searchReady: loadingDocumentTypeNames === false,
  }
}
