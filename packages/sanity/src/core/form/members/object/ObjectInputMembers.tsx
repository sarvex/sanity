import React from 'react'
import {ObjectMember} from '../../store'
import {
  RenderAnnotationCallback,
  RenderArrayOfObjectsItemCallback,
  RenderBlockCallback,
  RenderFieldCallback,
  RenderInputCallback,
  RenderPreviewCallback,
} from '../../types'

import {ObjectInputMember} from './ObjectInputMember'

/** @internal */
export interface ObjectMembersProps {
  members: ObjectMember[]
  renderAnnotation: RenderAnnotationCallback
  renderBlock: RenderBlockCallback
  renderInlineBlock: RenderBlockCallback
  renderInput: RenderInputCallback
  renderField: RenderFieldCallback
  renderItem: RenderArrayOfObjectsItemCallback
  renderPreview: RenderPreviewCallback
}

/**
 * Convenience component for wrapping an object input
 * @internal
 */
export function ObjectInputMembers(props: ObjectMembersProps) {
  const {members, ...rest} = props
  return (
    <>
      {members.map((member) => (
        <ObjectInputMember key={member.key} member={member} {...rest} />
      ))}
    </>
  )
}

/**
 * @deprecated Use ObjectInputMembers instead
 * @internal
 */
export const ObjectMembers = ObjectInputMembers
