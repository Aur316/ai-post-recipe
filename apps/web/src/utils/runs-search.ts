const STORAGE_KEY = 'runs.search'

export function rememberRunsSearch(search: string) {
  try {
    if (search) sessionStorage.setItem(STORAGE_KEY, search)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function runsListPath() {
  let search = ''
  try {
    search = sessionStorage.getItem(STORAGE_KEY) ?? ''
  } catch {}
  return search ? `/?${new URLSearchParams({ search }).toString()}` : '/'
}
