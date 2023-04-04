import {SyncIcon} from '@sanity/icons'
import {Box, Button, Card, Container, Flex, Heading, Spinner, Stack, Text} from '@sanity/ui'
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {SanityDocument} from '@sanity/types'
import styled from 'styled-components'
import {Delay, PaneContent, usePane, usePaneLayout, PaneItem} from '../../components'
import {useInputType} from '../../input-type'
import {DocumentListPaneItem} from './types'
import {
  CommandList,
  CommandListHandle,
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

const LoadingCard = styled(Card)`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
`

interface DocumentListPaneContentProps {
  childItemId?: string
  error: {message: string} | null
  // fullList: boolean // Do we need this?
  isActive?: boolean
  isLoading: boolean
  items: DocumentListPaneItem[]
  layout?: GeneralPreviewLayoutKey
  onListChange: () => void
  onRetry?: (event: unknown) => void
  showIcons: boolean
  searchInputElement: HTMLInputElement | null
  noDocumentsMessage?: React.ReactNode
}

export function DocumentListPaneContent(props: DocumentListPaneContentProps) {
  const {
    onListChange,
    childItemId,
    error,
    // fullList,
    isActive,
    isLoading,
    items,
    layout,
    noDocumentsMessage,
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

  const renderItem = useCallback(
    (item: SanityDocument) => {
      const publishedId = getPublishedId(item._id)
      const isSelected = childItemId === publishedId
      const pressed = !isActive && isSelected
      const selected = isActive && isSelected

      return (
        <PaneItem
          icon={showIcons === false ? false : undefined}
          id={publishedId}
          layout={layout}
          marginBottom={2}
          pressed={pressed}
          schemaType={schema.get(item._type)}
          selected={selected}
          value={item}
        />
      )
    },
    [childItemId, isActive, layout, schema, showIcons]
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

    // const hasMoreItems = fullList && items.length === FULL_LIST_LIMIT
    // prevents bug when panes won't render if first rendered while collapsed
    // TODO: DO WE NEED THIS?
    const key = `${index}-${collapsed}`

    return (
      <RootBox overflow="hidden" height="fill">
        <CommandListBox>
          <CommandList
            activeItemDataAttr="data-hovered"
            ariaLabel="Documents" // TODO: Add better aria-label
            disableActivateOnHover
            focusVisible={inputType === 'keyboard'}
            initialScrollAlign="center"
            inputElement={searchInputElement}
            itemHeight={51}
            items={items}
            key={key}
            onEndReached={onListChange}
            overscan={10}
            padding={2}
            paddingBottom={0}
            ref={commandListRef}
            renderItem={renderItem}
            tabIndex={0}
            wrapAround={false}
          />
        </CommandListBox>

        {/* TODO: Improve this */}
        {items.length > 0 && isLoading && (
          <Delay ms={300}>
            <LoadingCard padding={5}>
              <Flex align="center" direction="column" height="fill" justify="center">
                <Spinner muted />
              </Flex>
            </LoadingCard>
          </Delay>
        )}
      </RootBox>
    )

    // return (
    //   <Box padding={2}>
    //     {isLoading && (
    //       <Card borderTop marginTop={1} paddingX={3} paddingY={4}>
    //         <Text align="center" muted size={1}>
    //           Loading…
    //         </Text>
    //       </Card>
    //     )}

    //     {hasMoreItems && (
    //       <Card marginTop={1} paddingX={3} paddingY={4} radius={2} tone="transparent">
    //         <Text align="center" muted size={1}>
    //           Displaying a maximum of {FULL_LIST_LIMIT} documents
    //         </Text>
    //       </Card>
    //     )}
    //   </Box>
    // )
  }, [
    collapsed,
    error,
    index,
    inputType,
    isLoading,
    items,
    noDocumentsMessage,
    onListChange,
    onRetry,
    renderItem,
    searchInputElement,
    shouldRender,
  ])

  return <PaneContent overflow={layoutCollapsed ? undefined : 'auto'}>{content}</PaneContent>
}
