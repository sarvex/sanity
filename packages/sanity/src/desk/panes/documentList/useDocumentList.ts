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
  const {apiVersion, filter, params, sortOrder, searchQuery} = opts
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS)
  const schema = useSchema()

  const [result, setResult] = useState<QueryResult>(INITIAL_STATE)
  const error = result?.error || null
  const isLoading = result?.loading || result === null
  const onRetry = result?.onRetry
  const documents = result?.result?.documents

  // Documents filtered to remove published documents that have a draft version.
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
    if (!documentTypeNames) return []

    // Extract the preview title field for each document type (that is, the visible title in the list)
    return documentTypeNames
      .map((name) => schema.get(name)?.preview?.select?.title)
      .filter(Boolean) as string[]
  }, [documentTypeNames, schema])

  // Construct the query to fetch the documents
  const query = useMemo(() => {
    const start = pageIndex * PARTIAL_PAGE_LIMIT
    const end = start + PARTIAL_PAGE_LIMIT
    const range = `[${start}...${end}]`

    return createDocumentListQuery({
      filter,
      range,
      searchFields,
      searchQuery,
      sortOrder,
    })
  }, [filter, pageIndex, searchFields, searchQuery, sortOrder])

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

  // Reset the result and page index when the filter, params, sort order or search query changes.
  useEffect(() => {
    setResult(INITIAL_STATE)
    setPageIndex(0)
  }, [filter, params, sortOrder, searchQuery])

  return {
    error,
    handleListChange,
    hasMaxItems,
    isLoading: isLoading || loadingDocumentTypeNames,
    items,
    onRetry,
  }
}
