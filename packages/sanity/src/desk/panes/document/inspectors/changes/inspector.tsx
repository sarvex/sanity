import {ObjectDiff} from '@sanity/diff'
import {CloseIcon} from '@sanity/icons'
import {AvatarStack, BoundaryElementProvider, Box, Button, Card, Flex, Text} from '@sanity/ui'
import React, {ReactElement, useRef} from 'react'
import styled from 'styled-components'
import {TimelineMenu} from '../../timeline'
import {useDocumentPane} from '../../useDocumentPane'
import {DocumentInspectorHeaderCard} from '../../documentInspector'
import {LoadingContent} from './LoadingContent'
import {collectLatestAuthorAnnotations} from './helpers'
import {
  ChangeFieldWrapper,
  ChangeList,
  DiffTooltip,
  DocumentChangeContext,
  DocumentChangeContextInstance,
  DocumentInspectorProps,
  NoChanges,
  ScrollContainer,
  UserAvatar,
} from 'sanity'

const Scroller = styled(ScrollContainer)`
  height: 100%;
  overflow: auto;
  position: relative;
  scroll-behavior: smooth;
`

export default function ChangesInspector(props: DocumentInspectorProps): ReactElement {
  const {documentId, onHistoryClose, historyController, schemaType, value} = useDocumentPane()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const historyState = historyController.selectionState
  const loading = historyState === 'loading'
  const since = historyController.sinceTime
  const diff: ObjectDiff<any> | null = historyController.currentObjectDiff()
  const isComparingCurrent = !historyController.onOlderRevision()

  const documentContext: DocumentChangeContextInstance = React.useMemo(
    () => ({
      documentId,
      schemaType,
      FieldWrapper: ChangeFieldWrapper,
      rootDiff: diff,
      isComparingCurrent,
      value,
    }),
    [documentId, diff, isComparingCurrent, schemaType, value]
  )

  const changeAnnotations = React.useMemo(
    () => (diff ? collectLatestAuthorAnnotations(diff) : []),
    [diff]
  )

  return (
    <Flex data-testid="review-changes-pane" direction="column" height="fill" overflow="hidden">
      <DocumentInspectorHeaderCard as="header" flex="none">
        <Flex padding={2} paddingBottom={0}>
          <Box flex={1} padding={3}>
            <Text as="h1" size={1} weight="semibold">
              Review changes
            </Text>
          </Box>
          <Box flex="none" padding={1}>
            <Button
              aria-label="Close changes inspector"
              fontSize={1}
              icon={CloseIcon}
              mode="bleed"
              onClick={onHistoryClose}
              padding={2}
            />
          </Box>
        </Flex>

        <Flex gap={1} padding={3} paddingTop={0} paddingBottom={2}>
          <Box flex={1}>
            <TimelineMenu mode="since" chunk={since} placement="bottom-start" />
          </Box>

          <Box flex="none">
            <DiffTooltip
              annotations={changeAnnotations}
              description="Changes by"
              // placement="left"
              portal
            >
              <AvatarStack maxLength={4}>
                {changeAnnotations.map(({author}) => (
                  <UserAvatar key={author} user={author} />
                ))}
              </AvatarStack>
            </DiffTooltip>
          </Box>
        </Flex>
      </DocumentInspectorHeaderCard>

      {/* <PaneHeader
        actions={
          <Button
            icon={CloseIcon}
            mode="bleed"
            onClick={onHistoryClose}
            padding={3}
            title="Hide changes panel"
          />
        }
        subActions={
          changeAnnotations.length > 0 && (
            <Box paddingRight={1}>
              <DiffTooltip
                annotations={changeAnnotations}
                description="Changes by"
                placement="bottom-end"
              >
                <AvatarStack maxLength={4}>
                  {changeAnnotations.map(({author}) => (
                    <UserAvatar key={author} user={author} />
                  ))}
                </AvatarStack>
              </DiffTooltip>
            </Box>
          )
        }
        tabs={<TimelineMenu mode="since" chunk={since} placement="bottom-start" />}
        title="Changes"
      /> */}

      <Card flex={1}>
        <BoundaryElementProvider element={scrollRef.current}>
          <Scroller data-ui="Scroller" ref={scrollRef}>
            <Box flex={1} padding={4}>
              <Content diff={diff} documentContext={documentContext} loading={loading} />
            </Box>
          </Scroller>
        </BoundaryElementProvider>
      </Card>
    </Flex>
  )
}

function Content({
  diff,
  documentContext,
  loading,
}: {
  diff: ObjectDiff<any> | null
  documentContext: DocumentChangeContextInstance
  loading: boolean
}) {
  const {schemaType} = useDocumentPane()

  if (loading) {
    return <LoadingContent />
  }

  if (!diff) {
    return <NoChanges />
  }

  return (
    <DocumentChangeContext.Provider value={documentContext}>
      <ChangeList diff={diff} schemaType={schemaType} />
    </DocumentChangeContext.Provider>
  )
}
