const STORAGE_KEY = 'runs.search'

/** The search of the runs list, so the "Runs" back links return to the filtered list. */
export function rememberRunsSearch(search: string) {
  try {
    if (search) sessionStorage.setItem(STORAGE_KEY, search)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked; the back link then opens the whole list.
  }
}

/** The runs list path with the last search, e.g. `/?search=revyan`. */
export function runsListPath() {
  let search = ''
  try {
    search = sessionStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    // See above.
  }
  return search ? `/?${new URLSearchParams({ search }).toString()}` : '/'
}
