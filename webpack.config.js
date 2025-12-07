module.exports = (options) => {
  const externals = options.externals || []

  return {
    ...options,
    externals: [
      ...externals,
      { canvas: 'commonjs canvas' },
    ],
  }
}
