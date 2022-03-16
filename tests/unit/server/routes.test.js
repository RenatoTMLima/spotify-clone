import { jest, test, describe, expect, beforeEach } from '@jest/globals'
import config from '../../../server/config.js'
import { handler } from '../../../server/routes.js'
import TestUtil from '../_util/testUtil.js'

const {
  pages,
  location
} = config

describe('#Routes - test suite for API response', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test('GET / - should redirect to home page', async () => {
    const params = TestUtil.defaultHandleParams()

    params.request.method = 'GET'
    params.request.url = '/'

    await handler(...params.values())

    expect(params.response.writeHead).toBeCalledWith(
      302,
      { 'Location': location.home }
    )
    expect(params.response.end).toHaveBeenCalled()
  })
  test.todo(`GET /home - should respond with ${pages.homeHTML} file stream`)
  test.todo(`GET /controller - should respond with ${pages.controllerHTML} file stream`)
  test.todo(`GET /file.ext - should respond with file stream`)
  test.todo(`GET /unknown - given an inexistent route it should respond with 404`)

  describe('Exceptions', () => {
    test.todo('Given inexistent file it should respond with 404')
    test.todo('Given an error it should respond with 500')
  })
})