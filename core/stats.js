  // Quantile q (0-1) of a list sorted in ascending order, linear between neighbours (the usual "type 7": the median of
  // 1, 2, 3, 4 is 2.5, its first quartile 1.75). null for an empty list. Admin Photo stats.
  function quantile(a, q) {
    if (!a.length) return null;
    const i = (a.length - 1) * Math.min(1, Math.max(0, q)),
      k = Math.floor(i);
    return a[k] + (a[Math.min(k + 1, a.length - 1)] - a[k]) * (i - k);
  }
  // How a list of numbers spreads (admin Photo stats › Overview: a median and a spread, not a box plot): count, sum,
  // mean, min, max, the median and the middle half (p25 to p75). The list is not changed.
  function distOf(L) {
    const a = L.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y),
      sum = a.reduce((t, x) => t + x, 0);
    return {
      n: a.length,
      sum,
      mean: a.length ? sum / a.length : null,
      min: a.length ? a[0] : null,
      p25: quantile(a, 0.25),
      med: quantile(a, 0.5),
      p75: quantile(a, 0.75),
      max: a.length ? a[a.length - 1] : null
    };
  }

