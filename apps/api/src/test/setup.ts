try {
  process.loadEnvFile('../../.env')
} catch {
  // CI provides the variables directly.
}
