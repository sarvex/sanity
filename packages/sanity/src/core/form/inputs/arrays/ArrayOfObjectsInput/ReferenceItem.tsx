import {
  Box,
  Button,
  Card,
  CardTone,
  Flex,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  Spinner,
  Text,
  Stack,
} from '@sanity/ui'
import React, {useCallback, useMemo, useRef} from 'react'
import {Reference, ReferenceSchemaType, SchemaType} from '@sanity/types'
import {
  CloseIcon,
  CopyIcon as DuplicateIcon,
  EllipsisVerticalIcon,
  LaunchIcon as OpenInNewTabIcon,
  SyncIcon as ReplaceIcon,
  TrashIcon,
} from '@sanity/icons'
import styled from 'styled-components'
import {ObjectItem, ObjectItemProps, RenderPreviewCallback} from '../../../types'
import {useScrollIntoViewOnFocusWithin} from '../../../hooks/useScrollIntoViewOnFocusWithin'
import {useDidUpdate} from '../../../hooks/useDidUpdate'
import {randomKey} from '../common/randomKey'
import {FormFieldValidationStatus} from '../../../components/formField'
import {FieldPresence} from '../../../../presence'

import {ChangeIndicator} from '../../../../changeIndicators'
import {RowLayout} from '../layouts/RowLayout'
import {PreviewReferenceValue} from '../../ReferenceInput/PreviewReferenceValue'
import {useReferenceInfo} from '../../ReferenceInput/useReferenceInfo'
import {AlertStrip} from '../../../components/AlertStrip'
import {set, unset} from '../../../patch'
import {createProtoArrayValue} from './createProtoArrayValue'
import {InsertMenu} from './InsertMenu'
import {useReferenceInput} from './_reference/useReferenceInput'

export interface ReferenceItemValue extends Omit<ObjectItem, '_type'>, Omit<Reference, '_key'> {}

interface Props<Item extends ReferenceItemValue>
  extends Omit<ObjectItemProps<ReferenceItemValue>, 'renderDefault'> {
  insertableTypes: SchemaType[]
  value: Item
  schemaType: ReferenceSchemaType
  sortable: boolean
  renderPreview: RenderPreviewCallback
}

function getTone({
  readOnly,
  hasErrors,
  hasWarnings,
}: {
  readOnly: boolean | undefined
  hasErrors: boolean
  hasWarnings: boolean
}): CardTone {
  if (readOnly) {
    return 'transparent'
  }
  if (hasErrors) {
    return 'critical'
  }
  return hasWarnings ? 'caution' : 'default'
}
const MENU_POPOVER_PROPS = {portal: true, tone: 'default'} as const

export const ReferencePreviewCard = styled(Card)`
  /* this is a hack to avoid layout jumps while previews are loading
     there's probably better ways of solving this */
  min-height: 35px;

  /* TextWithTone uses its own logic to set color, and we therefore need */
  /* to override this logic in order to set the correct color in different states */
  &[data-selected],
  &[data-pressed],
  &:active {
    [data-ui='TextWithTone'] {
      color: inherit;
    }
  }
`

export function ReferenceItem<Item extends ReferenceItemValue = ReferenceItemValue>(
  props: Props<Item>
) {
  const {
    schemaType,
    path,
    readOnly,
    onRemove,
    value,
    open,
    onInsert,
    onFocus,
    onBlur,
    presence,
    validation,
    inputId,
    changed,
    focused,
    children,
    sortable,
    insertableTypes,
    inputProps: {onChange, focusPath, onFocusPath},
  } = props

  const elementRef = useRef<HTMLDivElement | null>(null)

  const {EditReferenceLink, getReferenceInfo, selectedState, isCurrentDocumentLiveEdit} =
    useReferenceInput({
      path,
      schemaType,
      value,
    })

  // this is here to make sure the item is visible if it's being edited behind a modal
  useScrollIntoViewOnFocusWithin(elementRef, open)

  useDidUpdate(focused, (hadFocus, hasFocus) => {
    if (!hadFocus && hasFocus && elementRef.current) {
      // Note: if editing an inline item, focus is handled by the item input itself and no ref is being set
      elementRef.current?.focus()
    }
  })

  const hasErrors = props.validation.some((v) => v.level === 'error')
  const hasWarnings = props.validation.some((v) => v.level === 'warning')
  const resolvingInitialValue = (value as any)._resolvingInitialValue

  const handleDuplicate = useCallback(() => {
    onInsert({
      items: [{...value, _key: randomKey()}],
      position: 'after',
    })
  }, [onInsert, value])

  const handleInsert = useCallback(
    (pos: 'before' | 'after', insertType: SchemaType) => {
      onInsert({
        items: [{...createProtoArrayValue(insertType), _key: randomKey()}],
        position: pos,
      })
    },
    [onInsert]
  )
  const loadableReferenceInfo = useReferenceInfo(value?._ref, getReferenceInfo)

  const hasRef = value._ref
  const refTypeName = loadableReferenceInfo.result?.type || value?._strengthenOnPublish?.type
  const publishedReferenceExists = hasRef && loadableReferenceInfo.result?.preview?.published?._id

  const handleRemoveStrengthenOnPublish = useCallback(() => {
    onChange([
      schemaType.weak === true ? set(true, ['_weak']) : unset(['_weak']),
      unset(['_strengthenOnPublish']),
    ])
  }, [onChange, schemaType.weak])

  const refType = refTypeName
    ? schemaType.to.find((toType) => toType.name === refTypeName)
    : undefined
  const pressed = selectedState === 'pressed'
  const selected = selectedState === 'selected'

  const tone = getTone({readOnly, hasErrors, hasWarnings})
  const isEditing = !hasRef || focusPath[0] === '_ref'

  const menu = useMemo(
    () =>
      readOnly ? null : (
        <Box marginLeft={1}>
          <MenuButton
            button={<Button paddingY={3} paddingX={2} mode="bleed" icon={EllipsisVerticalIcon} />}
            id={`${inputId}-menuButton`}
            menu={
              <Menu>
                {!readOnly && (
                  <>
                    <MenuItem text="Remove" tone="critical" icon={TrashIcon} onClick={onRemove} />
                    <MenuItem
                      text={hasRef && isEditing ? 'Cancel replace' : 'Replace'}
                      icon={hasRef && isEditing ? CloseIcon : ReplaceIcon}
                      onClick={
                        hasRef && isEditing ? () => onFocusPath([]) : () => onFocusPath(['_ref'])
                      }
                    />
                    <MenuItem text="Duplicate" icon={DuplicateIcon} onClick={handleDuplicate} />
                    <InsertMenu onInsert={handleInsert} types={insertableTypes} />
                  </>
                )}

                {!readOnly && !isEditing && hasRef && <MenuDivider />}
                {!isEditing && hasRef && (
                  <MenuItem
                    as={EditReferenceLink}
                    data-as="a"
                    text="Open in new tab"
                    icon={OpenInNewTabIcon}
                  />
                )}
              </Menu>
            }
            popover={MENU_POPOVER_PROPS}
          />
        </Box>
      ),
    [
      readOnly,
      inputId,
      onRemove,
      hasRef,
      isEditing,
      handleDuplicate,
      handleInsert,
      insertableTypes,
      EditReferenceLink,
      onFocusPath,
    ]
  )

  const handleFixStrengthMismatch = useCallback(() => {
    onChange(schemaType.weak === true ? set(true, ['_weak']) : unset(['_weak']))
  }, [onChange, schemaType])

  const weakIs = value?._weak ? 'weak' : 'strong'
  const weakShouldBe = schemaType.weak === true ? 'weak' : 'strong'

  // If the reference value is marked with _strengthenOnPublish,
  // we allow weak references if the reference points to a document that has a draft but not a published
  // In all other cases we should display a "weak mismatch" warning
  const weakWarningOverride =
    hasRef && !loadableReferenceInfo.isLoading && value?._strengthenOnPublish

  const showWeakRefMismatch =
    !loadableReferenceInfo.isLoading && hasRef && weakIs !== weakShouldBe && !weakWarningOverride

  const preview =
    loadableReferenceInfo.result?.preview.draft || loadableReferenceInfo.result?.preview.published

  const footer = (
    <>
      {isCurrentDocumentLiveEdit && publishedReferenceExists && value._strengthenOnPublish && (
        <AlertStrip
          padding={1}
          title={schemaType.weak ? 'Finalize reference' : 'Convert to strong reference'}
          status="info"
          data-testid="alert-reference-published"
        >
          <Stack space={3}>
            <Text as="p" muted size={1}>
              <strong>{loadableReferenceInfo.result?.preview.published?.title as any}</strong> is
              published and this reference should now be{' '}
              {schemaType.weak ? <>finalized</> : <>converted to a strong reference</>}.
            </Text>
            <Button
              onClick={handleRemoveStrengthenOnPublish}
              text={<>Convert to strong reference</>}
              tone="positive"
            />
          </Stack>
        </AlertStrip>
      )}
      {showWeakRefMismatch && (
        <AlertStrip
          padding={1}
          title="Reference strength mismatch"
          status="warning"
          data-testid="alert-reference-strength-mismatch"
        >
          <Stack space={3}>
            <Text as="p" muted size={1}>
              This reference is <em>{weakIs}</em>, but according to the current schema it should be{' '}
              <em>{weakShouldBe}.</em>
            </Text>

            <Text as="p" muted size={1}>
              {schemaType.weak ? (
                <>
                  It will not be possible to delete the "{preview?.title}"-document without first
                  removing this reference.
                </>
              ) : (
                <>
                  This makes it possible to delete the "{preview?.title}"-document without first
                  deleting this reference, leaving this field referencing a nonexisting document.
                </>
              )}
            </Text>
            <Button
              onClick={handleFixStrengthMismatch}
              text={<>Convert to {weakShouldBe} reference</>}
              tone="caution"
            />
          </Stack>
        </AlertStrip>
      )}
      {loadableReferenceInfo.error && (
        <AlertStrip
          padding={1}
          title="Unable to load reference metadata"
          status="warning"
          data-testid="alert-reference-info-failed"
        >
          <Stack space={3}>
            <Text as="p" muted size={1}>
              Error: {loadableReferenceInfo.error.message}
            </Text>
            <Button onClick={loadableReferenceInfo.retry!} text={<>Retry</>} tone="primary" />
          </Stack>
        </AlertStrip>
      )}
    </>
  )

  const item = (
    <RowLayout
      menu={menu}
      presence={presence.length > 0 && <FieldPresence presence={presence} maxAvatars={1} />}
      validation={validation.length > 0 && <FormFieldValidationStatus validation={validation} />}
      footer={footer}
      tone={isEditing ? undefined : tone}
      focused={focused}
      dragHandle={sortable}
    >
      {isEditing ? (
        <Box padding={1}>{children}</Box>
      ) : (
        <ReferencePreviewCard
          forwardedAs={EditReferenceLink as any}
          tone="inherit"
          radius={2}
          data-as="a"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          documentId={value?._ref}
          documentType={refType?.name}
          disabled={resolvingInitialValue}
          paddingX={2}
          paddingY={1}
          onFocus={onFocus}
          __unstable_focusRing
          style={{position: 'relative'}}
          selected={selected}
          pressed={pressed}
          data-selected={selected ? true : undefined}
          data-pressed={pressed ? true : undefined}
        >
          <PreviewReferenceValue
            value={value}
            referenceInfo={loadableReferenceInfo}
            renderPreview={props.renderPreview}
            type={schemaType}
          />
          {resolvingInitialValue && (
            <Card
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0.6,
              }}
              tone="transparent"
              as={Flex}
              radius={2}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              justify="center"
            >
              <Flex align="center" justify="center" padding={3}>
                <Box marginX={3}>
                  <Spinner muted />
                </Box>
                <Text>Resolving initial value…</Text>
              </Flex>
            </Card>
          )}
        </ReferencePreviewCard>
      )}
    </RowLayout>
  )
  return (
    <ChangeIndicator path={path} isChanged={changed} hasFocus={Boolean(focused)}>
      {item}
    </ChangeIndicator>
  )
}