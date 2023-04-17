import {DEFAULT_ORDERING} from './constants'
import {toOrderClause} from './helpers'
import {SortOrder} from './types'

interface CreateDocumentListQueryOptions {
  filter: string
  range: string
  searchFields?: string[]
  searchQuery?: string | null
  sortOrder?: SortOrder
}

/** @internal */
export function createDocumentListQuery(options: CreateDocumentListQueryOptions): string {
  const {sortOrder, filter: filterProp, range, searchFields, searchQuery} = options
  const extendedProjection = sortOrder?.extendedProjection
  const projectionFields = ['_id', '_type']
  const finalProjection = projectionFields.join(',')
  const sortBy = sortOrder?.by || []
  const sort = sortBy.length > 0 ? sortBy : DEFAULT_ORDERING.by
  const order = toOrderClause(sort)

  const searchFilter = (searchFields || [])
    .map((field) => `${field} match "*${searchQuery}*"`)
    .join(' || ')

  // Add search filter if searchQuery and searchFields is present
  const filter = searchQuery && searchFilter ? `${filterProp} && (${searchFilter})` : filterProp

  if (extendedProjection) {
    const firstProjection = projectionFields.concat(extendedProjection).join(',')
    return [
      `*[${filter}] {${firstProjection}}`,
      `order(${order}) ${range}`,
      `{${finalProjection}}`,
    ].join('|')
  }

  return `*[${filter}]|order(${order})${range}{${finalProjection}}`
}
