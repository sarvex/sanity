import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Box, Card, Code, Stack, TextInput} from '@sanity/ui'
import shallowEquals from 'shallow-equals'
import {isEqual} from 'lodash'
import {SearchIcon} from '@sanity/icons'
import styled, {css} from 'styled-components'
import {
  EMPTY,
  Observable,
  Subject,
  debounce,
  distinctUntilChanged,
  finalize,
  map,
  of,
  takeUntil,
  tap,
  timer,
} from 'rxjs'
import {useObservableCallback} from 'react-rx'
import {Pane} from '../../components/pane'
import {_DEBUG} from '../../constants'
import {useDeskToolSetting} from '../../useDeskToolSetting'
import {BaseDeskToolPaneProps} from '../types'
import {PaneMenuItem} from '../../types'
import {useInputType} from '../../input-type'
import {DEFAULT_ORDERING, EMPTY_RECORD} from './constants'
import {
  applyOrderingFunctions,
  getTypeNameFromSingleTypeFilter,
  isSimpleTypeFilter,
} from './helpers'
import {DocumentListPaneContent} from './DocumentListPaneContent'
import {DocumentListPaneHeader} from './DocumentListPaneHeader'
import {SortOrder} from './types'
import {useDocumentList} from './useDocumentList'
import {GeneralPreviewLayoutKey, SourceProvider, useSchema, useSource, useUnique} from 'sanity'

type DocumentListPaneProps = BaseDeskToolPaneProps<'documentList'>

const EMPTY_ARRAY: never[] = []

const SearchCard = styled(Card)(({theme}) => {
  const radius = theme.sanity.radius[4]

  return css`
    border-radius: ${radius}px;

    [data-ui='TextInput'] {
      border-radius: inherit;
    }

    &[data-focus-visible='false'] {
      [data-ui='TextInput'] {
        box-shadow: none;
        span {
          box-shadow: none;
        }
        --card-focus-ring-color: transparent;
      }
    }
  `
})

function useShallowUnique<ValueType>(value: ValueType): ValueType {
  const valueRef = useRef<ValueType>(value)
  if (!shallowEquals(valueRef.current, value)) {
    valueRef.current = value
  }
  return valueRef.current
}

const addSelectedStateToMenuItems = (options: {
  menuItems?: PaneMenuItem[]
  sortOrderRaw?: SortOrder
  layout?: GeneralPreviewLayoutKey
}) => {
  const {menuItems, sortOrderRaw, layout} = options

  return menuItems?.map((item) => {
    if (item.params?.layout) {
      return {
        ...item,
        selected: layout === item.params?.layout,
      }
    }

    if (item?.params?.by) {
      return {
        ...item,
        selected: isEqual(sortOrderRaw?.by, item?.params?.by || EMPTY_ARRAY),
      }
    }

    return {...item, selected: false}
  })
}

/**
 * @internal
 */
export const DocumentListPane = memo(function DocumentListPane(props: DocumentListPaneProps) {
  const {childItemId, index, isActive, isSelected, pane, paneKey} = props
  const schema = useSchema()
  const {name: parentSourceName} = useSource()
  const {
    defaultLayout = 'default',
    displayOptions,
    initialValueTemplates = EMPTY_ARRAY,
    menuItemGroups,
    menuItems,
    options,
    title,
  } = pane
  const {apiVersion, defaultOrdering = EMPTY_ARRAY, filter} = options
  const params = useShallowUnique(options.params || EMPTY_RECORD)
  const sourceName = pane.source
  const typeName = useMemo(() => getTypeNameFromSingleTypeFilter(filter, params), [filter, params])
  const showIcons = displayOptions?.showIcons !== false
  const [layout, setLayout] = useDeskToolSetting<GeneralPreviewLayoutKey>(
    typeName,
    'layout',
    defaultLayout
  )

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [inputValue, setInputValue] = useState<string>('')

  const inputType = useInputType()
  const [searchInputElement, setSearchInputElement] = useState<HTMLInputElement | null>(null)

  // Ensure that we use the defaultOrdering value from structure builder if any as the default
  const defaultSortOrder = useMemo(() => {
    return defaultOrdering?.length > 0 ? {by: defaultOrdering} : DEFAULT_ORDERING
  }, [defaultOrdering])

  const [sortOrderRaw, setSortOrder] = useDeskToolSetting<SortOrder>(
    typeName,
    'sortOrder',
    defaultSortOrder
  )

  const sortWithOrderingFn =
    typeName && sortOrderRaw
      ? applyOrderingFunctions(sortOrderRaw, schema.get(typeName) as any)
      : sortOrderRaw

  const sortOrder = useUnique(sortWithOrderingFn)
  const filterIsSimpleTypeConstraint = isSimpleTypeFilter(filter)

  const noDocumentsMessage = useMemo(() => {
    if (searchQuery) {
      return (
        <>
          {`No documents found matching`} <b>”{searchQuery}”</b>
        </>
      )
    }

    if (filterIsSimpleTypeConstraint) {
      return `No documents of type ${typeName} found`
    }

    return 'No documents found'
  }, [filterIsSimpleTypeConstraint, searchQuery, typeName])

  const handleQueryChange = useObservableCallback(
    (event$: Observable<React.ChangeEvent<HTMLInputElement>>) => {
      return event$.pipe(
        map((event) => event.currentTarget.value),
        tap(setInputValue),
        debounce((value) => (value === '' ? EMPTY : timer(300))),
        distinctUntilChanged(),
        tap(setSearchQuery)
      )
    },
    []
  )

  const {error, handleListChange, isLoading, items, onRetry, hasMaxItems, searchReady} =
    useDocumentList({
      apiVersion,
      filter,
      params,
      searchQuery,
      sortOrder,
    })

  const menuItemsWithSelectedState = useMemo(
    () =>
      addSelectedStateToMenuItems({
        menuItems,
        sortOrderRaw,
        layout,
      }),
    [layout, menuItems, sortOrderRaw]
  )

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setInputValue('')
  }, [])

  // Reset search query on "Escape" key press
  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        handleClearSearch()
      }
    },
    [handleClearSearch]
  )

  // Clear search field when switching between panes
  useEffect(() => {
    handleClearSearch()
  }, [paneKey, handleClearSearch])

  const listPaneHeaderContent = (
    <Box paddingX={2} paddingBottom={2}>
      <SearchCard tone="transparent" data-focus-visible={inputType === 'keyboard'}>
        <TextInput
          autoComplete="off"
          border={false}
          clearButton={Boolean(searchQuery)}
          disabled={!searchReady}
          fontSize={[2, 1]}
          icon={SearchIcon}
          onChange={handleQueryChange}
          onClear={handleClearSearch}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search list"
          radius={2}
          ref={setSearchInputElement}
          spellCheck={false}
          value={inputValue}
        />
      </SearchCard>
    </Box>
  )

  return (
    <SourceProvider name={sourceName || parentSourceName}>
      <Pane
        currentMaxWidth={350}
        data-ui="DocumentListPane"
        id={paneKey}
        maxWidth={640}
        minWidth={320}
        selected={isSelected}
      >
        {_DEBUG && (
          <Card padding={4} tone="transparent">
            <Code>{pane.source || '(none)'}</Code>
          </Card>
        )}

        <Stack>
          <DocumentListPaneHeader
            contentAfter={listPaneHeaderContent}
            index={index}
            initialValueTemplates={initialValueTemplates}
            menuItemGroups={menuItemGroups}
            menuItems={menuItemsWithSelectedState}
            setLayout={setLayout}
            setSortOrder={setSortOrder}
            title={title}
          />
        </Stack>

        <DocumentListPaneContent
          childItemId={childItemId}
          error={error}
          hasMaxItems={hasMaxItems}
          isActive={isActive}
          isLoading={isLoading}
          items={items}
          layout={layout}
          noDocumentsMessage={noDocumentsMessage}
          onListChange={handleListChange}
          onRetry={onRetry}
          searchInputElement={searchInputElement}
          showIcons={showIcons}
        />
      </Pane>
    </SourceProvider>
  )
})
