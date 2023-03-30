import {isKeySegment, Path} from '@sanity/types'
import {castArray} from 'lodash'
import {
  ArrayOfObjectsFormNode,
  ArrayOfObjectsItemMember,
  BaseFormNode,
  FieldMember,
  FieldSetMember,
  ObjectFormNode,
} from '../types'
import {isMemberArrayOfObjects, isMemberObject} from '../../members/object/fields/asserters'
import {ALL_FIELDS_GROUP} from '../constants'
import {isArrayOfObjectsFormNode, isObjectFormNode} from '../types/asserters'

/** @internal */
export interface ExpandPathOperation {
  type: 'expandPath'
  path: Path
}

/** @internal */
export interface ExpandFieldSetOperation {
  type: 'expandFieldSet'
  path: Path
}

/** @internal */
export interface SetActiveGroupOperation {
  type: 'setSelectedGroup'
  path: Path
  groupName: string
}

/** @internal */
export type ExpandOperation =
  | ExpandPathOperation
  | ExpandFieldSetOperation
  | SetActiveGroupOperation

/**
 * This takes a form state and returns a list of operations required to open a node at a particular path
 * @param state - The form state
 * @param path - The path to open
 *
 * @internal
 */
export function getExpandOperations(node: BaseFormNode, path: Path) {
  if (isObjectFormNode(node)) {
    return expandObjectPath(node, path)
  }
  if (isArrayOfObjectsFormNode(node)) {
    return expandArrayPath(node, path)
  }
  return []
}

function expandObjectPath(node: ObjectFormNode, path: Path): ExpandOperation[] {
  // extract the field name for the current level we're looking
  const [fieldName, ...tail] = path

  // check if we can find the field inside a fieldset
  const fieldsetMember = node.members.find(
    (member): member is FieldSetMember =>
      member.kind === 'fieldSet' &&
      member.fieldSet.members.some(
        (field): field is FieldMember => field.kind === 'field' && field.name === fieldName
      )
  )

  // if we found the field in a fieldset we need to recurse into this fieldset's members, otherwise we can use the node's members
  const members = fieldsetMember ? fieldsetMember.fieldSet.members : node.members

  // look for the field inside the members array
  const fieldMember = members.find(
    (member): member is FieldMember => member.kind === 'field' && member.name === fieldName
  )

  // Group handling
  const schemaField = node.schemaType.fields.find((field) => field.name === fieldName)
  const selectedGroupName = node.groups.find((group) => group.selected)?.name
  const defaultGroupName = (node.schemaType.groups || []).find((group) => group.default)?.name
  const inSelectedGroup =
    selectedGroupName &&
    (selectedGroupName === ALL_FIELDS_GROUP.name ||
      (schemaField && castArray(schemaField.group).includes(selectedGroupName)))

  const ops: ExpandOperation[] = [{type: 'expandPath', path}]
  if (fieldsetMember) {
    // the field is inside a fieldset, make sure we expand it too
    ops.push({type: 'expandFieldSet', path: fieldsetMember.fieldSet.path})
  }

  if (!inSelectedGroup) {
    ops.push({
      type: 'setSelectedGroup',
      path: node.path,
      groupName: defaultGroupName || ALL_FIELDS_GROUP.name,
    })
  }

  if (fieldMember) {
    ops.push({type: 'expandPath', path: fieldMember.field.path})
  }

  if (tail.length === 0) {
    return ops
  }

  if (fieldMember && isMemberObject(fieldMember)) {
    return ops.concat([
      {type: 'expandPath', path: fieldMember.field.path},
      ...expandObjectPath(fieldMember.field, tail),
    ])
  }

  if (fieldMember && isMemberArrayOfObjects(fieldMember)) {
    return ops.concat([
      {type: 'expandPath', path: fieldMember.field.path},
      ...expandArrayPath(fieldMember.field, tail),
    ])
  }
  return ops
}

function expandArrayPath(state: ArrayOfObjectsFormNode, path: Path): ExpandOperation[] {
  // start at the root and make sure all groups/paths are expanded/activated along the way
  const [segment, ...rest] = path
  if (!isKeySegment(segment)) {
    throw new Error('Expected path segment to be an object with a _key property')
  }

  const foundMember = state.members.find(
    (member): member is ArrayOfObjectsItemMember => member.key === segment._key
  )

  if (!foundMember) {
    // tried to open a member that does not exist in the form state - it's likely hidden
    return []
  }
  return [{type: 'expandPath', path: path}, ...getExpandOperations(foundMember.item, rest)]
}
