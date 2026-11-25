import axios, { type AxiosRequestConfig } from 'axios'

const instance = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

export const httpClient = {
  get: async <T>(url: string, params?: unknown, config?: AxiosRequestConfig) =>
    (await instance.get<T>(url, { params, ...config })).data,

  post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    (await instance.post<T>(url, data, config)).data,

  put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    (await instance.put<T>(url, data, config)).data,

  patch: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    (await instance.patch<T>(url, data, config)).data,

  delete: async <T>(url: string, config?: AxiosRequestConfig) =>
    (await instance.delete<T>(url, config)).data,
}
