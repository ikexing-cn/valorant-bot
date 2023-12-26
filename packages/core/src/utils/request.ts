import { fetch as fetchWithProrxy } from 'node-fetch-native/proxy'
import { objectOmit } from './internal'
import type { ApiAuthFailure } from '../types/request'

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: object
}

export type Request = typeof createRequest
export function createRequest() {
  const sessionCookieJar: { [key: string]: string[] } = {}

  function generateHeaders(otherHeaders: object = {}) {
    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    for (const [key, value] of Object.entries(otherHeaders)) {
      if (value == null) continue
      headers.append(key, value)
    }
    return headers
  }

  async function request<T = any>(url: string, options: RequestOptions = {}) {
    const headers = generateHeaders({
      ...options.headers,
      cookie: sessionCookieJar[url]
        ? sessionCookieJar[url].join('; ')
        : undefined,
    })

    const response = await fetchWithProrxy(url, {
      ...objectOmit(options, ['body', 'headers']),
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers,
      credentials: 'include',
    })

    if (response.status === 401) {
      const responseJson = (await response.json()) as ApiAuthFailure
      throw new Error(
        `Authentication Failure: ${JSON.stringify(responseJson, null, 2)}`,
      )
    }

    const cookie = response.headers.getSetCookie()
    if (cookie) {
      sessionCookieJar[url] = cookie
    }
    return response.json() as Promise<T>
  }

  return request
}