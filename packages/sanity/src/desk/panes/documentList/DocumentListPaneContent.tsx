import {SyncIcon} from '@sanity/icons'
import {Box, Button, Container, Flex, Heading, Spinner, Stack, Text} from '@sanity/ui'
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {SanityDocument} from '@sanity/types'
import styled from 'styled-components'
import {Subject, debounceTime} from 'rxjs'
import {Delay, PaneContent, usePane, usePaneLayout, PaneItem} from '../../components'
import {useInputType} from '../../input-type'
import {DocumentListPaneItem} from './types'
import {
  CommandList,
  CommandListHandle,
  CommandListRenderItemCallback,
  GeneralPreviewLayoutKey,
  getPublishedId,
  useSchema,
} from 'sanity'

const RootBox = styled(Box)`
  position: relative;
`

const CommandListBox = styled(Box)`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
`

interface DocumentListPaneContentProps {
  childItemId?: string
  error: {message: string} | null
  hasMaxItems?: boolean
  isActive?: boolean
  isLoading: boolean
  items: DocumentListPaneItem[]
  layout?: GeneralPreviewLayoutKey
  noDocumentsMessage?: React.ReactNode
  onListChange: () => void
  onRetry?: (event: unknown) => void
  searchInputElement: HTMLInputElement | null
  showIcons: boolean
}

export function DocumentListPaneContent(props: DocumentListPaneContentProps) {
  const {
    childItemId,
    error,
    hasMaxItems,
    isActive,
    isLoading,
    items,
    layout,
    noDocumentsMessage,
    onListChange,
    onRetry,
    searchInputElement,
    showIcons,
  } = props

  const schema = useSchema()
  const inputType = useInputType()

  const {collapsed: layoutCollapsed, panes} = usePaneLayout()
  const {collapsed, index} = usePane()
  const [shouldRender, setShouldRender] = useState(false)
  const commandListRef = useRef<CommandListHandle | null>(null)

  const disableEndReachedRef = useRef<boolean>(false)
  const endReachedSubject = useRef(new Subject()).current

  // Run the onListChange callback and disable the end reached handler for a period of time.
  // This is to avoid triggering the end reached handler too often.
  // The end reached handler is re-enabled after a delay (see the useEffect below)
  const handleEndReached = useCallback(() => {
    if (disableEndReachedRef.current || isLoading) return

    disableEndReachedRef.current = true
    endReachedSubject.next(undefined)

    onListChange()
  }, [endReachedSubject, onListChange, isLoading])

  useEffect(() => {
    const sub = endReachedSubject.pipe(debounceTime(1000)).subscribe(() => {
      disableEndReachedRef.current = false
    })

    return () => {
      sub.unsubscribe()
    }
  }, [endReachedSubject])

  // Determine if the pane should be auto-focused
  useEffect(() => {
    if (panes.length - 1 === index && shouldRender) {
      commandListRef.current?.focusElement()
    }
  }, [childItemId, panes.length, index, shouldRender, items])

  useEffect(() => {
    if (collapsed) return undefined

    const timer = setTimeout(() => {
      setShouldRender(true)
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [collapsed, items])

  const renderItem = useCallback<CommandListRenderItemCallback<SanityDocument>>(
    (item, {activeIndex}) => {
      const publishedId = getPublishedId(item._id)
      const isSelected = childItemId === publishedId
      const pressed = !isActive && isSelected
      const selected = isActive && isSelected
      const showSpinner = activeIndex === items.length - 1 && isLoading

      return (
        <>
          <PaneItem
            icon={showIcons === false ? false : undefined}
            id={publishedId}
            layout={layout}
            marginBottom={1}
            pressed={pressed}
            schemaType={schema.get(item._type)}
            selected={selected}
            value={item}
          />

          {showSpinner && (
            <Flex align="center" justify="center" padding={4}>
              <Spinner muted />
            </Flex>
          )}

          {hasMaxItems && activeIndex === items.length - 1 && (
            <Box marginY={1} paddingX={3} paddingY={4}>
              <Text align="center" muted size={1}>
                Displaying maximum amount of documents
              </Text>
            </Box>
          )}
        </>
      )
    },
    [childItemId, isActive, isLoading, items.length, layout, schema, showIcons, hasMaxItems]
  )

  const content = useMemo(() => {
    if (!shouldRender) {
      return null
    }

    if (error) {
      return (
        <Flex align="center" direction="column" height="fill" justify="center">
          <Container width={1}>
            <Stack paddingX={4} paddingY={5} space={4}>
              <Heading as="h3">Could not fetch list items</Heading>
              <Text as="p">
                Error: <code>{error.message}</code>
              </Text>

              {onRetry && (
                <Box>
                  {/* eslint-disable-next-line react/jsx-handler-names */}
                  <Button icon={SyncIcon} onClick={onRetry} text="Retry" tone="primary" />
                </Box>
              )}
            </Stack>
          </Container>
        </Flex>
      )
    }

    if (isLoading && items.length === 0) {
      return (
        <Flex align="center" direction="column" height="fill" justify="center">
          <Delay ms={300}>
            <>
              <Spinner muted />
              <Box marginTop={3}>
                <Text align="center" muted size={1}>
                  Loading documents…
                </Text>
              </Box>
            </>
          </Delay>
        </Flex>
      )
    }

    if (!isLoading && items.length === 0) {
      return (
        <Flex align="center" direction="column" height="fill" justify="center">
          <Container width={1}>
            <Box paddingX={4} paddingY={5}>
              <Text align="center" muted size={1}>
                {noDocumentsMessage}
              </Text>
            </Box>
          </Container>
        </Flex>
      )
    }

    // prevents bug when panes won't render if first rendered while collapsed
    const key = `${index}-${collapsed}`

    return (
      <RootBox overflow="hidden" height="fill">
        <CommandListBox>
          <CommandList
            activeItemDataAttr="data-hovered"
            ariaLabel="Document list"
            disableActivateOnHover
            focusVisible={inputType === 'keyboard'}
            initialScrollAlign="center"
            inputElement={searchInputElement}
            itemHeight={51}
            items={items}
            key={key}
            onEndReached={handleEndReached}
            overscan={5}
            padding={2}
            paddingBottom={0}
            ref={commandListRef}
            renderItem={renderItem}
            tabIndex={0}
            wrapAround={false}
          />
        </CommandListBox>
      </RootBox>
    )
  }, [
    collapsed,
    error,
    handleEndReached,
    index,
    inputType,
    isLoading,
    items,
    noDocumentsMessage,
    onRetry,
    renderItem,
    searchInputElement,
    shouldRender,
  ])

  return <PaneContent overflow={layoutCollapsed ? undefined : 'auto'}>{content}</PaneContent>
}
