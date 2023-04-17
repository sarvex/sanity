import {createDocumentListQuery} from '../createDocumentListQuery'

describe('desk: createDocumentListQuery', () => {
  it('should create a query with filter and range', () => {
    const query = createDocumentListQuery({
      filter: '_type == $type',
      range: '[0...10]',
    })

    const result = `*[_type == $type]|order(_updatedAt desc)[0...10]{_id,_type}`

    expect(query).toBe(result)
  })

  it('should create a query with search string and search fields', () => {
    const query = createDocumentListQuery({
      filter: '_type == $type',
      range: '[0...10]',
      searchFields: ['title', 'description'],
      searchQuery: 'test',
    })

    const result = `*[_type == $type && (title match "*test*" || description match "*test*")]|order(_updatedAt desc)[0...10]{_id,_type}`

    expect(query).toBe(result)
  })

  it('should create a query with sort order', () => {
    const query = createDocumentListQuery({
      filter: '_type == $type',
      range: '[0...10]',
      sortOrder: {
        by: [{field: 'mySortField', direction: 'asc'}],
      },
    })

    const result = `*[_type == $type]|order(mySortField asc)[0...10]{_id,_type}`

    expect(query).toBe(result)
  })
})
